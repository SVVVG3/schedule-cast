import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import neynarClient from "@/lib/neynarClient";
import { validateAndRefreshSigner, postCastDirect, createSignerDirect } from "@/lib/neynar";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  console.log("Running scheduled casts posting job via API route");
  
  // Validate cron secret
  const cronSecret = process.env.CRON_SECRET;
  const requestSecret = request.nextUrl.searchParams.get('cron_secret');
  
  // Debug mode for testing
  const isDebug = request.nextUrl.searchParams.get('debug') === 'true';
  const forceFix = request.nextUrl.searchParams.get('fix') === 'true';
  
  // Skip secret validation in debug mode or validate the secret
  if (!isDebug && requestSecret !== cronSecret) {
    console.error(`Invalid cron secret provided: ${requestSecret}`);
    return NextResponse.json({ error: 'Invalid cron secret provided' }, { status: 401 });
  }

  try {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Starting scheduled casts posting job`);
    console.log(`[${timestamp}] NEYNAR_API_KEY present: ${!!process.env.NEYNAR_API_KEY}`);
    console.log(`[${timestamp}] Force fix mode: ${forceFix}`);
    console.log(`[${timestamp}] Debug mode: ${isDebug}`);

    // Check for fallback signer option
    const fallbackSignerUuid = request.nextUrl.searchParams.get('fallbackSigner');
    if (fallbackSignerUuid) {
      console.log(`[${timestamp}] Using fallback signer UUID: ${fallbackSignerUuid}`);
      
      // Verify the fallback signer is valid before proceeding
      try {
        // Test the fallback signer with Neynar
        const testResponse = await postCastDirect(
          fallbackSignerUuid,
          'Test message - please ignore. This is an automated check for signer validity.'
        );
        
        console.log(`[${timestamp}] Fallback signer validated successfully:`, testResponse);
      } catch (testError) {
        console.error(`[${timestamp}] Fallback signer validation failed:`, testError);
        return NextResponse.json({ 
          error: "Invalid fallback signer", 
          details: "The provided fallback signer UUID could not be validated with Neynar." 
        }, { status: 400 });
      }
    }

    // First, let's check for casts that were already posted but not marked as posted
    // This happens if the cast was successfully published but the DB update failed
    if (forceFix) {
      try {
        console.log(`[${timestamp}] Running fix for already posted casts...`);
        
        // Create a migration to mark casts as posted
        const { data: fixedCasts, error: fixError } = await supabase
          .from('scheduled_casts')
          .update({ 
            posted: true, 
            posted_at: new Date().toISOString() 
          })
          .eq('posted', false)
          .lte('scheduled_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Older than 24 hours
          .select();
        
        if (fixError) {
          console.error(`[${timestamp}] Error fixing old casts:`, fixError);
        } else {
          console.log(`[${timestamp}] Fixed ${fixedCasts?.length || 0} old casts that were stuck as not posted`);
        }
      } catch (fixErr) {
        console.error(`[${timestamp}] Error in fix operation:`, fixErr);
      }
    }

    // Check for the column names in the scheduled_casts table
    let timeColumn = 'scheduled_at'; // Changed default from 'scheduled_time' to 'scheduled_at'
    try {
      const { data: sample } = await supabase
        .from('scheduled_casts')
        .select('*')
        .limit(1);
      
      if (sample && sample.length > 0) {
        const columns = Object.keys(sample[0]);
        console.log(`[${timestamp}] Available columns in scheduled_casts:`, columns);
        
        const timeColumnCandidates = ['scheduled_time', 'schedule_time', 'scheduled_at', 'schedule_at', 'scheduled_for'];
        const foundTimeColumn = columns.find(col => timeColumnCandidates.includes(col));
        if (foundTimeColumn) {
          timeColumn = foundTimeColumn;
        }
      } else {
        console.log(`[${timestamp}] No sample data found to determine columns`);
      }
    } catch (error) {
      console.log(`[${timestamp}] Error checking columns:`, error);
      // Continue with default column name
    }

    console.log(`[${timestamp}] Using time column: ${timeColumn}`);

    // Get all scheduled casts that are due (excluding ones with errors unless older than 24 hours)
    const { data: casts, error } = await supabase
      .from('scheduled_casts')
      .select('*')
      .lte(timeColumn, new Date().toISOString())
      .eq('posted', false)
      .or(`error.is.null,updated_at.lt.${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}`);

    if (error) {
      console.error(`[${timestamp}] Error fetching scheduled casts:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[${timestamp}] Found ${casts?.length || 0} casts due for posting`);
    if (casts && casts.length > 0) {
      console.log(`[${timestamp}] Cast data sample:`, JSON.stringify(casts[0], null, 2));
    }
    
    let successCount = 0;
    let failCount = 0;
    let failureReasons = [];

    // Process each cast
    if (casts && casts.length > 0) {
      for (const cast of casts) {
        console.log(`[${timestamp}] Processing cast ${cast.id}`);
        
        try {
          // Verify cast has required fields
          if (!cast.content) {
            console.error(`[${timestamp}] Cast ${cast.id} is missing content`);
            failCount++;
            failureReasons.push({ id: cast.id, reason: "Missing content" });
            continue;
          }
          
          // Determine which field to use for signer identification
          let signerIdField = 'signer_uuid';
          if (!cast.signer_uuid) {
            // Check alternative field names
            const possibleFields = ['signer_id', 'user_id', 'uuid', 'signer', 'user_uuid'];
            for (const field of possibleFields) {
              if (cast[field]) {
                signerIdField = field;
                console.log(`[${timestamp}] Using ${field} instead of signer_uuid for cast ${cast.id}`);
                break;
              }
            }
            
            if (signerIdField === 'signer_uuid' && !cast.signer_uuid) {
              console.error(`[${timestamp}] Cast ${cast.id} is missing signer identification`);
              failCount++;
              failureReasons.push({ id: cast.id, reason: "Missing signer identification" });
              continue;
            }
          }
          
          // Check if we should use the fallback signer instead of the one in the cast
          const useEffectiveSignerId = fallbackSignerUuid || cast[signerIdField];
          
          // If fallback signer is provided, post directly using it first
          if (fallbackSignerUuid) {
            console.log(`[${timestamp}] Using fallback signer ${fallbackSignerUuid} for cast ${cast.id}`);
            try {
              try {
                // Use our direct API method
                const response = await postCastDirect(
                  fallbackSignerUuid,
                  cast.content,
                  cast.channel_id
                );
                
                console.log(`[${timestamp}] Successfully posted cast ${cast.id} using fallback signer`);
                
                // Mark as posted in database
                const { error: updateError } = await supabase
                  .from('scheduled_casts')
                  .update({ 
                    posted: true, 
                    posted_at: new Date().toISOString()
                  })
                  .eq('id', cast.id);
                  
                if (updateError) {
                  console.error(`[${timestamp}] Error marking cast ${cast.id} as posted:`, updateError);
                }
                
                successCount++;
                continue;
              } catch (neynarError: any) {
                // Special handling for Neynar API errors
                console.error(`[${timestamp}] Detailed Neynar error with fallback signer:`, typeof neynarError === 'object' ? JSON.stringify(neynarError) : neynarError);
                
                // Continue to try with normal flow since fallback failed
                console.log(`[${timestamp}] Fallback signer failed, trying original signer`);
              }
            } catch (directPostError: any) {
              console.error(`[${timestamp}] Failed to post with fallback signer:`, directPostError);
              // Continue to try with normal flow since fallback failed
            }
          }
          
          // Always look up the user's current signer instead of using the one from the cast
          // SIWN signers need approval after creation, so the cast's signer might be outdated
          let userData: any = null;
          try {
            console.log(`[${timestamp}] Looking up current approved signer for FID ${cast.fid}`);
            
            const { data: userDataResult, error: userError } = await supabase
              .from('users')
              .select('signer_uuid, signer_status')
              .eq('fid', cast.fid)
              .single();
              
            if (userError) {
              console.error(`[${timestamp}] No user found for FID ${cast.fid}:`, userError);
              failCount++;
              failureReasons.push({ 
                id: cast.id, 
                reason: `No user found for FID ${cast.fid}` 
              });
              continue;
            }
            
                          userData = userDataResult;
              
              if (!userData.signer_uuid) {
              console.error(`[${timestamp}] No signer found for user FID ${cast.fid}`);
              await supabase
                .from('scheduled_casts')
                .update({ 
                  error: 'No signer found - user needs to sign in with Neynar again',
                  updated_at: new Date().toISOString()
                })
                .eq('id', cast.id);
              
              failCount++;
              failureReasons.push({ 
                id: cast.id, 
                reason: 'No signer found for user' 
              });
              continue;
            }
            
            console.log(`[${timestamp}] Using current user signer: ${userData.signer_uuid} (status: ${userData.signer_status})`);
            
            // Validate the user's current signer
            if (cast.fid) {
              try {
                const { signerUuid: validSignerUuid, refreshed } = await validateAndRefreshSigner(userData.signer_uuid, cast.fid);
                
                if (refreshed) {
                  console.log(`[${timestamp}] User's signer was refreshed to: ${validSignerUuid}`);
                  // Update the userData with the new valid signer for posting
                  userData.signer_uuid = validSignerUuid;
                } else {
                  console.log(`[${timestamp}] User's signer is valid and approved`);
                }
              } catch (refreshError) {
                console.error(`[${timestamp}] Error validating/refreshing signer:`, refreshError);
                
                // If the error is specifically about needing approval, skip this cast
                if (refreshError instanceof Error && refreshError.message && refreshError.message.includes('Signer needs approval')) {
                  console.log(`[${timestamp}] Skipping cast ${cast.id} - signer needs approval`);
                  
                  // Mark this cast with an error to prevent retrying
                  await supabase
                    .from('scheduled_casts')
                    .update({ 
                      error: 'Signer needs approval in Warpcast before this cast can be posted',
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', cast.id);
                  
                  failCount++;
                  failureReasons.push({ 
                    id: cast.id, 
                    reason: 'Signer needs approval in Warpcast' 
                  });
                  continue;
                }
                
                // Continue with the original signer for other errors
              }
            }
            
            // Use our direct API method with the user's current approved signer
            const response = await postCastDirect(
              userData.signer_uuid,
              cast.content,
              cast.channel_id
            );
            
            console.log(`[${timestamp}] Successfully posted cast ${cast.id} using user's current signer: ${userData.signer_uuid}`);
            
            // Mark as posted in database
            try {
              const { error: updateError } = await supabase
                .from('scheduled_casts')
                .update({ 
                  posted: true, 
                  posted_at: new Date().toISOString(),
                  result: response
                })
                .eq('id', cast.id);

              if (updateError) {
                console.error(`[${timestamp}] First update attempt error:`, updateError);
                
                // Second attempt - try without result field if it's a schema cache issue
                if (updateError.message.includes('result') || updateError.message.includes('schema cache')) {
                  const { error: fallbackError } = await supabase
                    .from('scheduled_casts')
                    .update({ 
                      posted: true, 
                      posted_at: new Date().toISOString() 
                    })
                    .eq('id', cast.id);
                  
                  if (fallbackError) {
                    console.error(`[${timestamp}] Fallback update also failed:`, fallbackError);
                    throw fallbackError;
                  } else {
                    console.log(`[${timestamp}] Fallback update succeeded for cast ${cast.id}`);
                  }
                } else {
                  throw updateError;
                }
              }
            } catch (updateErr) {
              console.error(`[${timestamp}] Error marking cast ${cast.id} as posted:`, updateErr);
              // We don't fail the whole operation if just the update fails
              // The cast was still posted to Farcaster
            }
            
            successCount++;
            continue;
          } catch (directPostError: any) {
            console.error(`[${timestamp}] Failed to post with direct signer_uuid:`, directPostError);
            
            // If the error is about signer not being approved, skip this cast
            if (directPostError.message && directPostError.message.includes('SignerNotApproved')) {
              console.log(`[${timestamp}] Skipping cast ${cast.id} - signer not approved`);
              
              // Mark this cast with an error to prevent retrying
              await supabase
                .from('scheduled_casts')
                .update({ 
                  error: 'Signer needs approval in Warpcast before this cast can be posted',
                  updated_at: new Date().toISOString()
                })
                .eq('id', cast.id);
              
              failCount++;
              failureReasons.push({ 
                id: cast.id, 
                reason: 'Signer not approved in Warpcast' 
              });
              continue;
            }
            
            // User lookup was already done at the top, so this fallback is no longer needed
            
            // If all else fails and we have a fallback, try it again as last resort
            if (fallbackSignerUuid) {
              try {
                console.log(`[${timestamp}] Last resort: trying fallback signer again`);
                const response = await postCastDirect(
                  fallbackSignerUuid,
                  cast.content,
                  cast.channel_id
                );
                
                console.log(`[${timestamp}] Successfully posted cast ${cast.id} with fallback signer as last resort`);
                
                // Mark as posted in database
                const { error: updateError } = await supabase
                  .from('scheduled_casts')
                  .update({ 
                    posted: true, 
                    posted_at: new Date().toISOString() 
                  })
                  .eq('id', cast.id);
                  
                if (updateError) {
                  console.error(`[${timestamp}] Error marking cast ${cast.id} as posted:`, updateError);
                }
                
                successCount++;
                continue;
              } catch (fallbackError) {
                console.error(`[${timestamp}] Last resort fallback signer also failed:`, fallbackError);
              }
            }
            
            // All attempts failed
            failCount++;
            failureReasons.push({ 
              id: cast.id, 
              reason: `Failed to post with user's current signer: ${userData?.signer_uuid || 'none'}` 
            });
          }
        } catch (castError: any) {
          console.error(`[${timestamp}] Error posting cast ${cast.id}:`, castError);
          failCount++;
          failureReasons.push({ 
            id: cast.id, 
            reason: `General error: ${castError.message || JSON.stringify(castError)}` 
          });
        }
      }
    }

    console.log(`[${timestamp}] Completed job: ${successCount} succeeded, ${failCount} failed`);
    if (failureReasons.length > 0) {
      console.log(`[${timestamp}] Failure reasons:`, JSON.stringify(failureReasons, null, 2));
    }
    
    return NextResponse.json({
      success: true,
      message: `Processed ${casts?.length || 0} casts: ${successCount} succeeded, ${failCount} failed`,
      details: failureReasons
    });
  } catch (error) {
    console.error("Error in scheduled casts job:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)  
    }, { status: 500 });
  }
}
