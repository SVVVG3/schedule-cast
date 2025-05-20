import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import neynarClient from "@/lib/neynarClient";

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

    // Attempt to refresh schema cache first
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/refresh-schema`);
    } catch (cacheError) {
      console.log(`[${timestamp}] Schema refresh attempt error:`, cacheError);
      // Continue even if schema refresh fails
    }

    // Get problematic signers list from URL params
    const problematicSignersList = request.nextUrl.searchParams.get('fixSigners');
    let problematicSigners: string[] = [];
    if (problematicSignersList) {
      problematicSigners = problematicSignersList.split(',');
      console.log(`[${timestamp}] Fixing specific problematic signers:`, problematicSigners);
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

    // Check for table names in the database
    let signerTable = 'user_signers'; // Default table name
    try {
      // List tables in the database to find the correct signer table
      const { data: tables, error: tablesError } = await supabase
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');
        
      if (tablesError) {
        console.log(`[${timestamp}] Error listing tables:`, tablesError);
        // Try an alternative method to check tables
        try {
          // Direct SQL query to list tables
          const { data: tablesList } = await supabase.rpc('get_tables');
          if (tablesList) {
            console.log(`[${timestamp}] Available tables from RPC:`, tablesList);
            
            // Find potential signer tables
            const signerTableCandidates = tablesList.filter((table: string) => 
              table.includes('signer') || table.includes('user')
            );
            
            if (signerTableCandidates.length > 0) {
              console.log(`[${timestamp}] Potential signer tables:`, signerTableCandidates);
              // Use the first candidate
              signerTable = signerTableCandidates[0];
            }
          }
        } catch (rpcError) {
          console.log(`[${timestamp}] Error with RPC get_tables:`, rpcError);
          // Continue with default table name
        }
      } else if (tables && tables.length > 0) {
        console.log(`[${timestamp}] Available tables:`, tables.map(t => t.tablename));
        
        // Find potential signer tables
        const signerTableCandidates = tables
          .map(t => t.tablename)
          .filter(name => name.includes('signer') || name.includes('user'));
        
        if (signerTableCandidates.length > 0) {
          console.log(`[${timestamp}] Potential signer tables:`, signerTableCandidates);
          // Use the first candidate
          signerTable = signerTableCandidates[0];
        }
      }
    } catch (tableError) {
      console.log(`[${timestamp}] Error checking tables:`, tableError);
      // Continue with default table name
    }
    
    console.log(`[${timestamp}] Using signer table: ${signerTable}`);

    // Check for the column names in the scheduled_casts table
    let timeColumn = 'scheduled_time'; // Default
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
          
          // Check if this is a problematic signer we're trying to fix
          const signerId = cast[signerIdField];
          const isProblematicSigner = problematicSigners.includes(signerId) || forceFix;
          
          // If this is a known problematic signer and we're in fix mode, post directly
          if (isProblematicSigner) {
            console.log(`[${timestamp}] Identified problematic signer ${signerId}, attempting direct post`);
            try {
              const response = await neynarClient.publishCast({
                signerUuid: signerId,
                text: cast.content,
              });
              
              console.log(`[${timestamp}] Successfully posted cast ${cast.id} with problematic signer directly`);
              
              // Mark as posted in database
              const { error: updateError } = await supabase
                .from('scheduled_casts')
                .update({ 
                  posted: true, 
                  posted_at: new Date().toISOString()
                })
                .eq('id', cast.id);
                
              if (updateError) {
                console.error(`[${timestamp}] Error marking problematic cast ${cast.id} as posted:`, updateError);
              }
              
              successCount++;
              continue;
            } catch (directPostError: any) {
              console.error(`[${timestamp}] Failed to post problematic signer directly:`, directPostError);
              // Continue with normal flow as fallback
            }
          }
          
          // Check the structure of the signer table
          let signerUuidField = 'uuid'; // Default field name for signer uuid
          let signers = null;
          let signerError = null;
          
          try {
            // First try getting a sample from the signer table to check its structure
            const { data: signerSample, error: sampleError } = await supabase
              .from(signerTable)
              .select('*')
              .limit(1);
              
            if (sampleError) {
              console.error(`[${timestamp}] Error getting signer table sample:`, sampleError);
            } else if (signerSample && signerSample.length > 0) {
              console.log(`[${timestamp}] Signer table sample:`, JSON.stringify(signerSample[0], null, 2));
              
              // Try to get the signer with the appropriate field
              const { data: foundSigners, error: lookupError } = await supabase
                .from(signerTable)
                .select('*')
                .eq(signerUuidField, cast[signerIdField])
                .single();
                
              signers = foundSigners;
              signerError = lookupError;
            }
          } catch (signerTableError) {
            console.error(`[${timestamp}] Error working with signer table:`, signerTableError);
            signerError = signerTableError;
          }
          
          // Handle signer lookup results
          if (signerError) {
            console.error(`[${timestamp}] Error getting signer for cast ${cast.id}:`, signerError);
            
            // If we can't get the signer info, try to post directly using the signer ID from the cast
            // This assumes that the signer_uuid in the cast IS the actual signer UUID for Neynar
            try {
              console.log(`[${timestamp}] Attempting to post directly using signer ID from cast: ${cast[signerIdField]}`);
              const response = await neynarClient.publishCast({
                signerUuid: cast[signerIdField],
                text: cast.content,
              });
              
              console.log(`[${timestamp}] Successfully posted cast ${cast.id} to Farcaster using direct signer ID`);
              
              // If successful, create the missing signer entry
              if (forceFix) {
                try {
                  console.log(`[${timestamp}] Creating missing signer record for ${cast[signerIdField]}`);
                  const { data: newSigner, error: createError } = await supabase
                    .from(signerTable)
                    .insert([
                      { 
                        uuid: cast[signerIdField],
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      }
                    ])
                    .select();
                    
                  if (createError) {
                    console.error(`[${timestamp}] Failed to create signer record:`, createError);
                  } else {
                    console.log(`[${timestamp}] Created signer record:`, newSigner);
                  }
                } catch (createErr) {
                  console.error(`[${timestamp}] Error creating signer:`, createErr);
                }
              }
              
              // Mark as posted in database
              try {
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
              } catch (updateErr) {
                console.error(`[${timestamp}] Error marking cast ${cast.id} as posted:`, updateErr);
              }
              
              successCount++;
              continue;
            } catch (directPostError: any) {
              console.error(`[${timestamp}] Failed to post directly with signer ID:`, directPostError);
              failCount++;
              failureReasons.push({ 
                id: cast.id, 
                reason: `Signer error and direct post failed: ${(signerError as Error).message || JSON.stringify(signerError)}, ${(directPostError as Error).message || JSON.stringify(directPostError)}` 
              });
              continue;
            }
          }
          
          if (!signers) {
            console.error(`[${timestamp}] No signer found for ${signerIdField}: ${cast[signerIdField]}`);
            
            // Attempt to post directly even if signer isn't found
            try {
              console.log(`[${timestamp}] No signer found, attempting direct post with ID: ${cast[signerIdField]}`);
              const response = await neynarClient.publishCast({
                signerUuid: cast[signerIdField],
                text: cast.content,
              });
              
              console.log(`[${timestamp}] Successfully posted cast ${cast.id} using direct ID despite missing signer`);
              
              // If successful, create the missing signer entry
              if (forceFix) {
                try {
                  console.log(`[${timestamp}] Creating missing signer record for ${cast[signerIdField]}`);
                  const { data: newSigner, error: createError } = await supabase
                    .from(signerTable)
                    .insert([
                      { 
                        uuid: cast[signerIdField],
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      }
                    ])
                    .select();
                    
                  if (createError) {
                    console.error(`[${timestamp}] Failed to create signer record:`, createError);
                  } else {
                    console.log(`[${timestamp}] Created signer record:`, newSigner);
                  }
                } catch (createErr) {
                  console.error(`[${timestamp}] Error creating signer:`, createErr);
                }
              }
              
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
            } catch (directPostError: any) {
              console.error(`[${timestamp}] Failed to post with missing signer:`, directPostError);
              failCount++;
              failureReasons.push({ 
                id: cast.id, 
                reason: `No signer found with ${signerIdField}: ${cast[signerIdField]} and direct post failed` 
              });
              continue;
            }
          }
          
          console.log(`[${timestamp}] Found signer:`, JSON.stringify(signers, null, 2));
          
          // Determine the correct field to use for the signer UUID
          const signerUuid = signers.uuid || signers.signer_uuid || signers.id || cast[signerIdField];
          console.log(`[${timestamp}] Using signer UUID: ${signerUuid}`);

          // Cast the message to Farcaster
          try {
            const response = await neynarClient.publishCast({
              signerUuid: signerUuid,
              text: cast.content,
            });

            console.log(`[${timestamp}] Successfully posted cast ${cast.id} to Farcaster`);
            
            // Mark as posted in database - Using simpler update for schema cache issues
            try {
              // First attempt - using the standard update with all fields
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
          } catch (neynarError: any) {
            console.error(`[${timestamp}] Neynar API error for cast ${cast.id}:`, neynarError);
            failCount++;
            failureReasons.push({ 
              id: cast.id, 
              reason: `Neynar API error: ${neynarError.message || JSON.stringify(neynarError)}` 
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
