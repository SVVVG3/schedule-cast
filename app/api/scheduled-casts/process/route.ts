import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Function to post a cast using SIWF credentials via Neynar
async function postCastWithSIWF(siwf_message: string, siwf_signature: string, cast_content: string) {
  const apiKey = process.env.NEYNAR_API_KEY;
  
  if (!apiKey) {
    throw new Error('Missing NEYNAR_API_KEY');
  }

  console.log('[postCastWithSIWF] Posting cast via Neynar API...');

  // Use Neynar's cast API with SIWF authentication
  const response = await fetch('https://api.neynar.com/v2/farcaster/cast', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api_key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      text: cast_content,
      signer_uuid: null, // We're using SIWF instead of UUID signer
      // Include SIWF credentials for authentication
      auth: {
        type: 'siwf',
        message: siwf_message,
        signature: siwf_signature
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[postCastWithSIWF] Neynar API error:', errorText);
    throw new Error(`Neynar API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('[postCastWithSIWF] Cast posted successfully:', result.cast?.hash);
  
  return result;
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
    const { data: dueCasts, error: fetchError } = await supabase
      .from('scheduled_casts')
      .select(`
        *,
        user_signers!inner(siwf_message, siwf_signature, is_active, expires_at)
      `)
      .eq('status', 'pending')
      .lte('scheduled_time', now.toISOString())
      .eq('user_signers.is_active', true);

    if (fetchError) {
      console.error('[process-scheduled-casts] Error fetching due casts:', fetchError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log(`[process-scheduled-casts] Found ${dueCasts?.length || 0} due casts`);

    const results = {
      processed: 0,
      posted: 0,
      failed: 0,
      expired: 0,
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

        // Check if signer credentials have expired
        const signer = cast.user_signers;
        if (signer.expires_at && new Date(signer.expires_at) <= now) {
          console.log(`[process-scheduled-casts] Signer expired for cast ${cast.id}`);
          
          await supabase
            .from('scheduled_casts')
            .update({
              status: 'failed',
              error_message: 'Posting permissions expired',
              updated_at: now.toISOString()
            })
            .eq('id', cast.id);
          
          results.expired++;
          continue;
        }

        // Post the cast using SIWF credentials
        const postResult = await postCastWithSIWF(
          signer.siwf_message,
          signer.siwf_signature,
          cast.cast_content
        );

        // Update the scheduled cast as posted
        await supabase
          .from('scheduled_casts')
          .update({
            status: 'posted',
            cast_hash: postResult.cast?.hash || null,
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