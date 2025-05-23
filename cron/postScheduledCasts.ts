/**
 * Cron job to post scheduled casts
 * 
 * This script fetches scheduled casts that are due to be posted and
 * sends them to Farcaster via the Neynar API.
 * 
 * It should be run every minute via a cron job or scheduled task.
 */

import { supabase } from '../lib/supabase';
import { postCastDirect, checkSignerStatus, retryWithBackoff } from '../lib/neynar';

interface ScheduledCast {
  id: string;
  content: string;
  scheduled_time: string;
  posted: boolean;
  fid: number;
  signer_uuid: string;
  username: string;
}

export async function postScheduledCasts() {
  console.log('[postScheduledCasts] Starting scheduled cast processing...');
  
  try {
    // Get all scheduled casts that are due to be posted
    const now = new Date().toISOString();
    const { data: scheduledCasts, error } = await supabase
      .from('scheduled_casts')
      .select('*')
      .eq('posted', false)
      .lte('scheduled_time', now);

    if (error) {
      console.error('[postScheduledCasts] Error fetching scheduled casts:', error);
      return;
    }

    if (!scheduledCasts || scheduledCasts.length === 0) {
      console.log('[postScheduledCasts] No scheduled casts due for posting');
      return;
    }

    console.log(`[postScheduledCasts] Processing ${scheduledCasts.length} scheduled casts`);

    let successCount = 0;
    let failureCount = 0;

    for (const cast of scheduledCasts as ScheduledCast[]) {
      try {
        console.log(`[postScheduledCasts] Processing cast ${cast.id} for user ${cast.username} (FID: ${cast.fid})`);
        
        // First, check if the user's signer is approved
        let signerApproved = false;
        let currentSignerUuid = cast.signer_uuid;
        
        if (currentSignerUuid) {
          try {
            const signerStatus = await retryWithBackoff(() => checkSignerStatus(currentSignerUuid));
            signerApproved = signerStatus.approved;
            
            // Update the user's signer status in database
            await supabase
              .from('users')
              .update({
                signer_status: signerStatus.status,
                needs_signer_approval: !signerStatus.approved,
                last_signer_check: new Date().toISOString()
              })
              .eq('fid', cast.fid);
              
            console.log(`[postScheduledCasts] Signer ${currentSignerUuid} status: ${signerStatus.status}, approved: ${signerApproved}`);
          } catch (signerError) {
            console.error(`[postScheduledCasts] Error checking signer status for ${currentSignerUuid}:`, signerError);
            signerApproved = false;
          }
        }
        
        if (!signerApproved) {
          console.log(`[postScheduledCasts] Signer not approved for cast ${cast.id}. User needs to approve their signer.`);
          
          // Update the cast with a helpful error message
          await supabase
            .from('scheduled_casts')
            .update({
              error_message: 'Signer not approved. Please visit your approval URL to authorize Schedule-Cast.',
              failed_at: new Date().toISOString()
            })
            .eq('id', cast.id);
            
          failureCount++;
          continue;
        }

        // Attempt to post the cast
        console.log(`[postScheduledCasts] Posting cast: "${cast.content.substring(0, 50)}..."`);
        
        const result = await retryWithBackoff(() => postCastDirect(currentSignerUuid, cast.content));
        
        console.log(`[postScheduledCasts] Successfully posted cast ${cast.id}`);
        
        // Mark the cast as posted
        const { error: updateError } = await supabase
          .from('scheduled_casts')
          .update({
            posted: true,
            posted_at: new Date().toISOString(),
            cast_hash: result.cast?.hash || null,
            error_message: null // Clear any previous errors
          })
          .eq('id', cast.id);

        if (updateError) {
          console.error(`[postScheduledCasts] Error updating cast ${cast.id}:`, updateError);
        }

        successCount++;

      } catch (castError: any) {
        console.error(`[postScheduledCasts] Error posting cast ${cast.id}:`, castError);
        
        // Update the cast with error information
        await supabase
          .from('scheduled_casts')
          .update({
            error_message: castError.message || 'Unknown error occurred',
            failed_at: new Date().toISOString()
          })
          .eq('id', cast.id);

        failureCount++;
      }
    }

    console.log(`[postScheduledCasts] Completed processing: ${successCount} successful, ${failureCount} failed`);

  } catch (error) {
    console.error('[postScheduledCasts] Unexpected error:', error);
  }
}

// Run the main function if this is executed directly (not imported)
if (require.main === module) {
  postScheduledCasts()
    .then(() => {
      console.log('Job completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error(`Job failed with error: ${error.message}`);
      process.exit(1);
    });
} 