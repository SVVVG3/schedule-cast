/**
 * Cron job to post scheduled casts
 * 
 * This script fetches scheduled casts that are due to be posted and
 * sends them to Farcaster via the Neynar API.
 * 
 * It should be run every minute via a cron job or scheduled task.
 */

import { supabase } from '@/lib/supabase';
import { postCastDirect, validateAndRefreshSigner, NeynarError } from '@/lib/neynar';

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
    
    // Skip if missing fid
    if (!cast.fid) {
      log(`Cast ${cast.id} missing fid, marking as error`);
      await markCastAsError(cast.id, 'Missing fid');
      return { success: false, error: 'Missing fid' };
    }
    
    // First check if user needs approval
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('signer_uuid, signer_status, signer_approval_url, needs_signer_approval')
      .eq('fid', cast.fid)
      .maybeSingle();
    
    if (userError) {
      log(`Error fetching user for cast ${cast.id}: ${userError.message}`);
      await markCastAsError(cast.id, `Error fetching user: ${userError.message}`);
      return { success: false, error: `Error fetching user: ${userError.message}` };
    }
    
    if (!user) {
      log(`No user found for FID ${cast.fid} for cast ${cast.id}`);
      await markCastAsError(cast.id, `No user found for FID ${cast.fid}`);
      return { success: false, error: `No user found for FID ${cast.fid}` };
    }
    
    // If the user needs signer approval or the signer status isn't approved, skip this cast
    if (user.needs_signer_approval || (user.signer_status && user.signer_status !== 'approved')) {
      const reason = user.signer_approval_url
        ? `Signer not approved. User needs to approve at: ${user.signer_approval_url}`
        : 'Signer not approved. User needs to login to approve signer.';
        
      log(`Skipping cast ${cast.id}: ${reason}`);
      await markCastAsError(cast.id, reason);
      return { success: false, error: reason };
    }
    
    // Validate and refresh the signer if needed
    try {
      log(`Validating signer ${cast.signer_uuid} for cast ${cast.id}`);
      
      const { signerUuid, refreshed, approved } = await validateAndRefreshSigner(cast.signer_uuid, cast.fid);
      
      if (refreshed) {
        log(`Signer was refreshed for cast ${cast.id}, using new signer: ${signerUuid}`);
        
        // Update the cast with the new signer_uuid
        const { error: updateError } = await supabase
          .from('scheduled_casts')
          .update({ signer_uuid: signerUuid })
          .eq('id', cast.id);
          
        if (updateError) {
          log(`Error updating cast ${cast.id} with new signer: ${updateError.message}`);
        }
        
        // Use the new signer UUID
        cast.signer_uuid = signerUuid;
        
        // Check if the refreshed signer is approved
        if (!approved) {
          const reason = 'New signer needs approval. Please login to approve the signer.';
          await markCastAsError(cast.id, reason);
          return { success: false, error: reason };
        }
      }
      
      // Post to Farcaster via Neynar
      try {
        const result = await postCastDirect(
          cast.signer_uuid,
          cast.content,
          cast.channel_id || undefined
        );
        
        // Mark as posted
        await markCastAsPosted(cast.id, result);
        
        log(`Successfully posted cast ${cast.id}`);
        return { success: true, result };
      } catch (postError) {
        // If the post fails with a signer error, try to decode the error
        const error = postError as NeynarError;
        
        if (error.status === 403 && error.message.includes('Signer')) {
          // This is likely a signer approval issue
          const errorObj = tryParseError(error.message);
          
          if (errorObj && errorObj.code === 'SignerNotApproved') {
            // Update the user record to indicate they need approval
            await supabase
              .from('users')
              .update({ 
                needs_signer_approval: true,
                signer_status: 'generated'
              })
              .eq('fid', cast.fid);
            
            const reason = 'Signer not approved. Please login to approve the signer.';
            await markCastAsError(cast.id, reason);
            return { success: false, error: reason };
          }
        }
        
        // For other errors, mark as error and return
        await markCastAsError(cast.id, error.message);
        return { success: false, error: error.message };
      }
    } catch (signerError) {
      const error = signerError as Error;
      log(`Failed to validate/refresh signer for cast ${cast.id}: ${error.message}`);
      
      // Check if this is a signer approval issue
      if (error.message.includes('needs approval') || error.message.includes('not approved')) {
        // Update the user record to indicate they need approval
        const approvalUrl = extractApprovalUrl(error.message);
        await supabase
          .from('users')
          .update({ 
            needs_signer_approval: true,
            signer_status: 'generated',
            signer_approval_url: approvalUrl || null
          })
          .eq('fid', cast.fid);
        
        const reason = approvalUrl
          ? `Signer needs approval. Please visit: ${approvalUrl}`
          : 'Signer needs approval. Please login to approve the signer.';
          
        await markCastAsError(cast.id, reason);
        return { success: false, error: reason };
      }
      
      // For other errors, just mark as error
      await markCastAsError(cast.id, error.message);
      return { success: false, error: error.message };
    }
  } catch (error) {
    const errorMessage = (error as Error).message || 'Unknown error';
    log(`Error posting cast ${cast.id}: ${errorMessage}`);
    
    // Mark as error
    await markCastAsError(cast.id, errorMessage);
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Try to parse an error message as JSON
 */
function tryParseError(errorMessage: string): any {
  try {
    // First check if the string contains a JSON object
    const match = errorMessage.match(/\{.*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Extract approval URL from error message
 */
function extractApprovalUrl(message: string): string | null {
  // Try to extract a URL from the error message
  const urlMatch = message.match(/https?:\/\/[^\s"']+/);
  if (urlMatch) {
    return urlMatch[0];
  }
  return null;
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
    
    // Prepare detailed results
    const failedDetails = results
      .filter(r => !r.success)
      .map((r, i) => ({
        id: dueCasts[i].id,
        reason: r.error
      }));
    
    return {
      success: true,
      message: `Processed ${dueCasts.length} casts: ${successCount} succeeded, ${failedCount} failed`,
      details: failedDetails
    };
  } catch (error) {
    log(`Unexpected error in cron job: ${(error as Error).message}`);
    return { 
      success: false,
      message: `Job failed with error: ${(error as Error).message}`,
      processed: 0, 
      successCount: 0, 
      failedCount: 0, 
      error: (error as Error).message 
    };
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