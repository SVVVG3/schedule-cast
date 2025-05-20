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
  
  // Skip secret validation in debug mode or validate the secret
  if (!isDebug && requestSecret !== cronSecret) {
    console.error(`Invalid cron secret provided: ${requestSecret}`);
    return NextResponse.json({ error: 'Invalid cron secret provided' }, { status: 401 });
  }

  try {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Starting scheduled casts posting job`);

    // Attempt to refresh schema cache first
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/refresh-schema`);
    } catch (cacheError) {
      console.log(`[${timestamp}] Schema refresh attempt error:`, cacheError);
      // Continue even if schema refresh fails
    }

    // Check for the column names in the table
    let timeColumn = 'scheduled_time'; // Default
    try {
      const { data: sample } = await supabase
        .from('scheduled_casts')
        .select('*')
        .limit(1);
      
      if (sample && sample.length > 0) {
        const columns = Object.keys(sample[0]);
        const timeColumnCandidates = ['scheduled_time', 'schedule_time', 'scheduled_at', 'schedule_at', 'scheduled_for'];
        const foundTimeColumn = columns.find(col => timeColumnCandidates.includes(col));
        if (foundTimeColumn) {
          timeColumn = foundTimeColumn;
        }
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
    
    let successCount = 0;
    let failCount = 0;

    // Process each cast
    if (casts && casts.length > 0) {
      for (const cast of casts) {
        console.log(`[${timestamp}] Processing cast ${cast.id}`);
        
        try {
          // Get user signer
          const { data: signers, error: signerError } = await supabase
            .from('user_signers')
            .select('*')
            .eq('uuid', cast.signer_uuid)
            .single();

          if (signerError || !signers) {
            console.error(`[${timestamp}] Error getting signer for cast ${cast.id}:`, signerError);
            failCount++;
            continue;
          }

          // Cast the message to Farcaster
          const response = await neynarClient.publishCast({
            signerUuid: signers.uuid,
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
        } catch (castError) {
          console.error(`[${timestamp}] Error posting cast ${cast.id}:`, castError);
          failCount++;
        }
      }
    }

    console.log(`[${timestamp}] Completed job: ${successCount} succeeded, ${failCount} failed`);
    
    return NextResponse.json({
      success: true,
      message: `Processed ${casts?.length || 0} casts: ${successCount} succeeded, ${failCount} failed`
    });
  } catch (error) {
    console.error("Error in scheduled casts job:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
