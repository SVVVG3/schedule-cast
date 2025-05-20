/**
 * Cron job to post scheduled casts
 * 
 * This script fetches scheduled casts that are due to be posted and
 * sends them to Farcaster via the Neynar API.
 * 
 * It should be run every minute via a cron job or scheduled task.
 */

import { supabase } from '@/lib/supabase';
import { postCast } from '@/lib/neynar';

// Number of casts to process per batch
const BATCH_SIZE = 10;

// Logging utility
function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

/**
 * Process a single scheduled cast
 */
async function processCast(cast: any) {
  try {
    log(`Processing cast ${cast.id}`);
    
    // Skip if already posted
    if (cast.posted) {
      log(`Cast ${cast.id} already posted, skipping`);
      return { success: true, skipped: true };
    }
    
    // Skip if missing required data
    if (!cast.signer_uuid) {
      log(`Cast ${cast.id} missing signer_uuid, marking as error`);
      await markCastAsError(cast.id, 'Missing signer_uuid');
      return { success: false, error: 'Missing signer_uuid' };
    }
    
    // Post to Farcaster via Neynar
    const result = await postCast(
      cast.signer_uuid,
      cast.content,
      cast.channel_id || undefined
    );
    
    // Mark as posted
    await markCastAsPosted(cast.id, result);
    
    log(`Successfully posted cast ${cast.id}`);
    return { success: true, result };
  } catch (error) {
    const errorMessage = (error as Error).message || 'Unknown error';
    log(`Error posting cast ${cast.id}: ${errorMessage}`);
    
    // Mark as error
    await markCastAsError(cast.id, errorMessage);
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Mark a cast as posted in the database
 */
async function markCastAsPosted(castId: string, result: any) {
  const { error } = await supabase
    .from('scheduled_casts')
    .update({
      posted: true,
      posted_at: new Date().toISOString(),
      result: JSON.stringify(result)
    })
    .eq('id', castId);
  
  if (error) {
    log(`Error marking cast ${castId} as posted: ${error.message}`);
  }
}

/**
 * Mark a cast as having an error
 */
async function markCastAsError(castId: string, errorMessage: string) {
  const { error } = await supabase
    .from('scheduled_casts')
    .update({
      error: errorMessage
    })
    .eq('id', castId);
  
  if (error) {
    log(`Error updating cast ${castId} error status: ${error.message}`);
  }
}

/**
 * Fetch scheduled casts that are due to be posted
 */
async function fetchDueCasts() {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('scheduled_casts')
    .select('*')
    .lte('scheduled_at', now)
    .eq('posted', false)
    .is('error', null)
    .order('scheduled_at', { ascending: true })
    .limit(BATCH_SIZE);
  
  if (error) {
    log(`Error fetching due casts: ${error.message}`);
    return [];
  }
  
  return data || [];
}

/**
 * Main function to run the cron job
 */
export async function main() {
  try {
    log('Starting scheduled casts posting job');
    
    // Fetch casts that are due
    const dueCasts = await fetchDueCasts();
    log(`Found ${dueCasts.length} casts due for posting`);
    
    if (dueCasts.length === 0) {
      log('No casts to process, exiting');
      return { processed: 0, success: 0, failed: 0 };
    }
    
    // Process each cast
    const results = await Promise.all(dueCasts.map(processCast));
    
    // Summarize results
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    log(`Completed job: ${successCount} succeeded, ${failedCount} failed`);
    
    return {
      processed: dueCasts.length,
      success: successCount,
      failed: failedCount
    };
  } catch (error) {
    log(`Unexpected error in cron job: ${(error as Error).message}`);
    return { processed: 0, success: 0, failed: 0, error: (error as Error).message };
  }
}

// Run the main function if this is executed directly (not imported)
if (require.main === module) {
  main()
    .then((result) => {
      log('Job completed', result);
      process.exit(0);
    })
    .catch((error) => {
      log(`Job failed with error: ${error.message}`);
      process.exit(1);
    });
} 