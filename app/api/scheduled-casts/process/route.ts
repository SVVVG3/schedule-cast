import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';

// Create Neynar client
const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY!,
});
const neynarClient = new NeynarAPIClient(config);

// Function to post a cast using managed signer via Neynar
async function postCastWithManagedSigner(signerUuid: string, castContent: string) {
  console.log('[postCastWithManagedSigner] Posting cast via Neynar API with signer:', signerUuid);

  try {
    // Use Neynar's publishCast method with the managed signer
    const result = await neynarClient.publishCast({
      signerUuid: signerUuid,
      text: castContent
    });
    
    console.log('[postCastWithManagedSigner] Cast posted successfully:', result.cast?.hash);
    return result;
  } catch (error) {
    console.error('[postCastWithManagedSigner] Neynar API error:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify this is being called by our cron job (basic security)
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[process-scheduled-casts] Processing due scheduled casts...');

    const now = new Date();
    
    // Get all pending scheduled casts that are due
    // Join with managed_signers to get approved signer UUIDs
    const { data: dueCasts, error: fetchError } = await supabase
      .from('scheduled_casts')
      .select(`
        *,
        managed_signers!inner(signer_uuid, status)
      `)
      .eq('status', 'pending')
      .lte('scheduled_time', now.toISOString())
      .eq('managed_signers.status', 'approved');

    if (fetchError) {
      console.error('[process-scheduled-casts] Error fetching due casts:', fetchError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log(`[process-scheduled-casts] Found ${dueCasts?.length || 0} due casts with approved signers`);

    const results = {
      processed: 0,
      posted: 0,
      failed: 0,
      no_signer: 0,
      errors: [] as string[]
    };

    if (!dueCasts || dueCasts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No due casts to process',
        results
      });
    }

    // Process each due cast
    for (const cast of dueCasts) {
      results.processed++;
      
      try {
        console.log(`[process-scheduled-casts] Processing cast ${cast.id}...`);

        const managedSigner = cast.managed_signers;
        if (!managedSigner || managedSigner.status !== 'approved') {
          console.log(`[process-scheduled-casts] No approved signer for cast ${cast.id}`);
          
          await supabase
            .from('scheduled_casts')
            .update({
              status: 'failed',
              error_message: 'No approved posting permissions',
              updated_at: now.toISOString()
            })
            .eq('id', cast.id);
          
          results.no_signer++;
          continue;
        }

        // Post the cast using managed signer
        const postResult = await postCastWithManagedSigner(
          managedSigner.signer_uuid,
          cast.cast_content
        );

        // Update the scheduled cast as posted
        await supabase
          .from('scheduled_casts')
          .update({
            status: 'posted',
            cast_hash: postResult.cast?.hash || null,
            managed_signer_uuid: managedSigner.signer_uuid,
            updated_at: now.toISOString()
          })
          .eq('id', cast.id);

        console.log(`[process-scheduled-casts] Cast ${cast.id} posted successfully`);
        results.posted++;

      } catch (error) {
        console.error(`[process-scheduled-casts] Error processing cast ${cast.id}:`, error);
        
        // Update the scheduled cast as failed
        await supabase
          .from('scheduled_casts')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            updated_at: now.toISOString()
          })
          .eq('id', cast.id);

        results.failed++;
        results.errors.push(`Cast ${cast.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('[process-scheduled-casts] Processing complete:', results);

    return NextResponse.json({
      success: true,
      message: 'Scheduled casts processed',
      results
    });

  } catch (error) {
    console.error('[process-scheduled-casts] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}

// Also allow GET for manual testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Scheduled cast processor endpoint. Use POST to process due casts.',
    timestamp: new Date().toISOString()
  });
}