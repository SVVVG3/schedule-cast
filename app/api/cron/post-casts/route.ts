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

    // Get all scheduled casts that are due
    const { data: casts, error } = await supabase
      .from('scheduled_casts')
      .select('*')
      .lte('scheduled_time', new Date().toISOString())
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

          console.log(`[${timestamp}] Successfully posted cast ${cast.id}`);
          
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
              console.error(`[${timestamp}] Error marking cast ${cast.id} as posted:`, updateError);
            }
          } catch (updateErr) {
            console.error(`[${timestamp}] Error marking cast ${cast.id} as posted:`, updateErr);
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
