import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import neynarClient from "@/lib/neynarClient";
import { validateAndRefreshSigner } from "@/lib/neynar";

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
        const testResponse = await neynarClient.publishCast({
          signerUuid: fallbackSignerUuid,
          text: 'Test message - please ignore. This is an automated check for signer validity.',
        });
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

    // Get all scheduled casts that are due
    const { data: casts, error } = await supabase
      .from('scheduled_casts')
      .select('*')
      .lte(timeColumn, new Date().toISOString())
      .eq('posted', false);

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
              // Enhanced error handling for Neynar API
              try {
                const response = await neynarClient.publishCast({
                  signerUuid: fallbackSignerUuid,
                  text: cast.content,
                });
                
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
                
                if (neynarError.response && neynarError.response.data) {
                  console.error(`[${timestamp}] Neynar API response:`, neynarError.response.data);
                }
                
                // Continue to try with normal flow since fallback failed
                console.log(`[${timestamp}] Fallback signer failed, trying original signer`);
              }
            } catch (directPostError: any) {
              console.error(`[${timestamp}] Failed to post with fallback signer:`, directPostError);
              // Continue to try with normal flow since fallback failed
            }
          }
          
          // Try to post directly using the signer UUID from the cast
          // This is more reliable than looking for a separate user_signers table that doesn't exist
          try {
            console.log(`[${timestamp}] Attempting to post directly using cast's signer_uuid: ${cast[signerIdField]}`);
            
            // First validate and refresh the signer if needed
            if (cast.fid) {
              try {
                const { signerUuid: validSignerUuid, refreshed } = await validateAndRefreshSigner(cast[signerIdField], cast.fid);
                
                if (refreshed) {
                  console.log(`[${timestamp}] Signer was invalid and has been refreshed to: ${validSignerUuid}`);
                  // Update the signerIdField value with the new valid signer
                  cast[signerIdField] = validSignerUuid;
                } else {
                  console.log(`[${timestamp}] Signer is valid and doesn't need refreshing`);
                }
              } catch (refreshError) {
                console.error(`[${timestamp}] Error validating/refreshing signer:`, refreshError);
                // Continue with the original signer, it might still work
              }
            }
            
            const response = await neynarClient.publishCast({
              signerUuid: cast[signerIdField],
              text: cast.content,
            });
            
            console.log(`[${timestamp}] Successfully posted cast ${cast.id} using direct cast signer_uuid`);
            
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
            
            // If we have a FID, try to look up the current signer from the users table
            if (cast.fid) {
              try {
                console.log(`[${timestamp}] Looking up current signer for FID ${cast.fid} in users table`);
                const { data: userData, error: userError } = await supabase
                  .from('users')
                  .select('signer_uuid')
                  .eq('fid', cast.fid)
                  .single();
                  
                if (userError) {
                  console.error(`[${timestamp}] Error looking up user:`, userError);
                } else if (userData && userData.signer_uuid && userData.signer_uuid !== cast[signerIdField]) {
                  // User exists and has a different signer UUID than the one in the cast
                  console.log(`[${timestamp}] Found different signer_uuid in users table: ${userData.signer_uuid}`);
                  
                  try {
                    const userSignerResponse = await neynarClient.publishCast({
                      signerUuid: userData.signer_uuid,
                      text: cast.content,
                    });
                    
                    console.log(`[${timestamp}] Successfully posted cast ${cast.id} with user's current signer`);
                    
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
                  } catch (userSignerError) {
                    console.error(`[${timestamp}] Failed to post with user's current signer:`, userSignerError);
                  }
                }
              } catch (userLookupError) {
                console.error(`[${timestamp}] Error looking up user:`, userLookupError);
              }
            }
            
            // If all else fails and we have a fallback, try it again as last resort
            if (fallbackSignerUuid) {
              try {
                console.log(`[${timestamp}] Last resort: trying fallback signer again`);
                const response = await neynarClient.publishCast({
                  signerUuid: fallbackSignerUuid,
                  text: cast.content,
                });
                
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
              reason: `No signer found with ${signerIdField}: ${cast[signerIdField]} and direct post failed` 
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
