/**
 * Neynar API wrapper for interacting with Farcaster
 * 
 * This library provides functions to:
 * 1. Post casts using a signer
 * 2. Fetch relevant Farcaster data
 */

// API endpoint constants
const NEYNAR_API_URL = 'https://api.neynar.com/v2/farcaster';
const CAST_ENDPOINT = `${NEYNAR_API_URL}/cast`;
const SIGNER_ENDPOINT = `${NEYNAR_API_URL}/signer`;
const DEVELOPER_MANAGED_SIGNER_ENDPOINT = `${NEYNAR_API_URL}/signer/developer_managed`;

import { registerUserSigner } from '@/utils/registerUserSigner';
import { supabase } from './supabase';

// Error types
export class NeynarError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.name = 'NeynarError';
    this.status = status;
  }
}

// Rate limiting utilities
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry wrapper for API calls with exponential backoff
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on non-rate-limit errors
      if (!(error instanceof NeynarError) || error.status !== 429) {
        throw error;
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s, etc.
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[retryWithBackoff] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

/**
 * Post a cast to Farcaster using the Neynar API
 * 
 * @param signerUuid The unique identifier for the signer
 * @param content The text content of the cast (max 320 chars)
 * @param channelId Optional channel ID to post to
 * @returns The API response with cast details
 */
export async function postCast(
  signerUuid: string,
  content: string,
  channelId?: string
) {
  if (!process.env.NEYNAR_API_KEY) {
    throw new NeynarError('Neynar API key is missing', 500);
  }

  if (!signerUuid) {
    throw new NeynarError('Signer UUID is required', 400);
  }

  if (!content || content.length > 320) {
    throw new NeynarError(
      'Cast content is required and must be 320 characters or less',
      400
    );
  }

  try {
    // Prepare the request body
    const requestBody: Record<string, any> = {
      signer_uuid: signerUuid,
      text: content,
    };

    // Add channel ID if provided
    if (channelId) {
      requestBody.channel_id = channelId;
    }

    // Make the API request
    const response = await fetch(CAST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NEYNAR_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    // Parse the response
    const data = await response.json();

    // Handle API errors
    if (!response.ok) {
      throw new NeynarError(
        data.message || 'Failed to post cast',
        response.status
      );
    }

    return data;
  } catch (error) {
    if (error instanceof NeynarError) {
      throw error;
    }
    throw new NeynarError(`Unexpected error: ${(error as Error).message}`, 500);
  }
}

/**
 * Get information about a signer
 * 
 * @param signerUuid The unique identifier for the signer
 * @returns The signer information
 */
export async function getSignerInfo(signerUuid: string) {
  if (!process.env.NEYNAR_API_KEY) {
    throw new NeynarError('Neynar API key is missing', 500);
  }

  if (!signerUuid) {
    throw new NeynarError('Signer UUID is required', 400);
  }

  try {
    // Use the correct endpoint for Neynar managed signers
    const response = await fetch(`https://api.neynar.com/v2/farcaster/signer/${signerUuid}`, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.NEYNAR_API_KEY,
      },
    });

    // Parse the response
    const data = await response.json();

    // Handle API errors
    if (!response.ok) {
      throw new NeynarError(
        data.message || 'Failed to get signer information',
        response.status
      );
    }

    return data;
  } catch (error) {
    if (error instanceof NeynarError) {
      throw error;
    }
    throw new NeynarError(`Unexpected error: ${(error as Error).message}`, 500);
  }
}

/**
 * Create a signer for a Farcaster user
 * 
 * This function uses Neynar's managed signer approach to create a new signer
 * for the specified Farcaster user.
 * 
 * @param fid The Farcaster ID of the user
 * @returns The created signer information including signer_uuid and approval_url
 */
export async function createSigner(fid: number) {
  if (!process.env.NEYNAR_API_KEY) {
    throw new NeynarError('Neynar API key is missing', 500);
  }

  if (!fid) {
    throw new NeynarError('Farcaster ID (fid) is required', 400);
  }

  try {
    console.log('[createSigner] Creating managed signer for FID:', fid);
    
    // Use the registerUserSigner utility to create a managed signer via Neynar
    const signerInfo = await registerUserSigner(fid, false, { includeDebugLogs: true });
    
    console.log('[createSigner] Successfully registered signer:', signerInfo.signer_uuid);
    
    return {
      signer_uuid: signerInfo.signer_uuid,
      public_key: signerInfo.public_key,
      signer_approval_url: signerInfo.signer_approval_url
    };
  } catch (error) {
    console.error('[createSigner] Error:', error);
    if (error instanceof NeynarError) {
      throw error;
    }
    throw new NeynarError(`Failed to create signer: ${(error as Error).message}`, 500);
  }
}

/**
 * Validates if a signer is still valid, and refreshes it if not
 * 
 * @param signerUuid The signer UUID to validate
 * @param fid The Farcaster ID associated with the signer
 * @returns An object with the valid signer UUID and whether it was refreshed
 */
export async function validateAndRefreshSigner(signerUuid: string, fid: number) {
  if (!process.env.NEYNAR_API_KEY) {
    throw new NeynarError('Neynar API key is missing', 500);
  }

  if (!signerUuid || !fid) {
    throw new NeynarError('Signer UUID and FID are required', 400);
  }

  console.log(`[validateAndRefreshSigner] Validating signer ${signerUuid} for FID ${fid}`);
  
  try {
    // First, try to get signer information to check if it's valid
    try {
      const signerInfo = await retryWithBackoff(() => getSignerInfo(signerUuid));
      console.log(`[validateAndRefreshSigner] Signer is valid, status:`, signerInfo.status || 'unknown');
      
      // Check if the signer is approved
      if (signerInfo.status !== 'approved') {
        throw new NeynarError(`Signer is not approved, status: ${signerInfo.status}`, 403);
      }
      
      return { signerUuid, refreshed: false, approved: true };
    } catch (validationError) {
      // Log detailed error information
      console.error(`[validateAndRefreshSigner] Signer validation failed with error:`, 
        typeof validationError === 'object' ? JSON.stringify(validationError) : validationError);

      console.log(`[validateAndRefreshSigner] Creating new signer for FID ${fid}`);
      
      // Signer is invalid, create a new one
      try {
        const newSignerData = await retryWithBackoff(() => createSignerDirect());
        const newSignerUuid = newSignerData.signer_uuid;
        
        console.log(`[validateAndRefreshSigner] New signer created: ${newSignerUuid}, status: ${newSignerData.status}`);
        
        // Update the user record in the database
        const { error } = await supabase
          .from('users')
          .update({ 
            signer_uuid: newSignerUuid,
            signer_approval_url: newSignerData.signer_approval_url || null,
            signer_status: newSignerData.status || 'generated'
          })
          .eq('fid', fid);
        
        if (error) {
          console.error(`[validateAndRefreshSigner] Failed to update user record with new signer:`, error);
          throw new NeynarError(`Failed to update user record with new signer: ${error.message}`, 500);
        }
        
        // Check if the signer is approved
        const isApproved = newSignerData.status === 'approved';
        
        // If it's not approved, throw an error with the approval URL
        if (!isApproved) {
          throw new NeynarError(
            `Signer needs approval. Please visit: ${newSignerData.signer_approval_url}`,
            403
          );
        }
        
        // Also update any scheduled casts that haven't been posted yet
        try {
          const { error: castsError } = await supabase
            .from('scheduled_casts')
            .update({ signer_uuid: newSignerUuid })
            .eq('fid', fid)
            .eq('posted', false);
          
          if (castsError) {
            console.error(`[validateAndRefreshSigner] Error updating scheduled casts:`, castsError);
            // Don't fail the operation if this part fails
          }
        } catch (castsUpdateError) {
          console.error(`[validateAndRefreshSigner] Error updating scheduled casts:`, castsUpdateError);
          // Don't fail the operation if this part fails
        }
        
        console.log(`[validateAndRefreshSigner] Refreshed signer for FID ${fid}: ${newSignerUuid}`);
        return { signerUuid: newSignerUuid, refreshed: true, approved: isApproved };
      } catch (createError) {
        console.error(`[validateAndRefreshSigner] Failed to create new signer:`, createError);
        throw new NeynarError(`Failed to create new signer: ${(createError as Error).message}`, 500);
      }
    }
  } catch (error) {
    console.error(`[validateAndRefreshSigner] Error:`, error);
    throw error instanceof NeynarError ? error : new NeynarError(`Unexpected error: ${(error as Error).message}`, 500);
  }
}

/**
 * Create a Neynar managed signer (recommended approach)
 * This creates a signer that's managed by Neynar with proper approval flow
 */
export async function createSignerDirect() {
  if (!process.env.NEYNAR_API_KEY) {
    throw new NeynarError('Neynar API key is missing', 500);
  }

  try {
    console.log('[createSignerDirect] Creating Neynar managed signer');
    
    // Use the Neynar managed signer endpoint (simpler and recommended)
    const response = await fetch("https://api.neynar.com/v2/farcaster/signer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.NEYNAR_API_KEY
      },
      body: JSON.stringify({
        sponsored_by_neynar: true // Let Neynar sponsor the signer for free
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[createSignerDirect] API error:', errorText);
      
      // Check for rate limiting
      if (response.status === 429) {
        throw new NeynarError('Rate limit exceeded. Please try again later.', 429);
      }
      
      throw new NeynarError(`Failed to create signer: ${errorText}`, response.status);
    }
    
    const data = await response.json();
    console.log('[createSignerDirect] API response:', JSON.stringify(data, null, 2));
    
    // Use the approval URL from API response if available, otherwise construct it
    // Based on Neynar docs, the token should be the public_key, not signer_uuid
    const approvalUrl = data.signer_approval_url || 
      `https://client.warpcast.com/deeplinks/signed-key-request?token=${data.public_key}`;
    
    console.log('[createSignerDirect] Successfully created signer:', data.signer_uuid);
    console.log('[createSignerDirect] Approval URL:', approvalUrl);
    
    return {
      signer_uuid: data.signer_uuid,
      public_key: data.public_key,
      status: data.status || 'pending_approval',
      signer_approval_url: approvalUrl,
      approved: data.status === 'approved',
      sponsored: data.sponsored_by_neynar || true
    };
  } catch (error) {
    console.error('[createSignerDirect] Error:', error);
    if (error instanceof NeynarError) {
      throw error;
    }
    throw new NeynarError(`Failed to create signer: ${(error as Error).message}`, 500);
  }
}

/**
 * Check the current status of a signer
 * This is used to poll until the user approves the signer
 */
export async function checkSignerStatus(signerUuid: string) {
  if (!process.env.NEYNAR_API_KEY) {
    throw new NeynarError('Neynar API key is missing', 500);
  }

  if (!signerUuid) {
    throw new NeynarError('Signer UUID is required', 400);
  }

  try {
    console.log('[checkSignerStatus] Checking status for signer:', signerUuid);
    
    // Use the correct endpoint for Neynar managed signers
    const response = await fetch(`https://api.neynar.com/v2/farcaster/signer/${signerUuid}`, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.NEYNAR_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[checkSignerStatus] API error:', errorText);
      
      if (response.status === 429) {
        throw new NeynarError('Rate limit exceeded. Please try again later.', 429);
      }
      
      throw new NeynarError(`Failed to check signer status: ${errorText}`, response.status);
    }

    const data = await response.json();
    console.log('[checkSignerStatus] Signer status:', data.status);
    
    return {
      signer_uuid: data.signer_uuid,
      public_key: data.public_key,
      status: data.status,
      approved: data.status === 'approved'
    };
  } catch (error) {
    console.error('[checkSignerStatus] Error:', error);
    if (error instanceof NeynarError) {
      throw error;
    }
    throw new NeynarError(`Failed to check signer status: ${(error as Error).message}`, 500);
  }
}

/**
 * Post a cast via direct Neynar API call with retry logic
 * This bypasses the SDK due to API changes and includes rate limit handling
 */
export async function postCastDirect(
  signerUuid: string,
  content: string,
  channelId?: string
) {
  return retryWithBackoff(async () => {
    if (!process.env.NEYNAR_API_KEY) {
      throw new NeynarError('Neynar API key is missing', 500);
    }

    if (!signerUuid) {
      throw new NeynarError('Signer UUID is required', 400);
    }

    if (!content || content.length > 320) {
      throw new NeynarError(
        'Cast content is required and must be 320 characters or less',
        400
      );
    }

    try {
      console.log('[postCastDirect] Posting cast using signer:', signerUuid);
      
      // Prepare the request body
      const requestBody: Record<string, any> = {
        signer_uuid: signerUuid,
        text: content,
      };

      // Add channel ID if provided
      if (channelId) {
        requestBody.channel_id = channelId;
      }
      
      const response = await fetch("https://api.neynar.com/v2/farcaster/cast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEYNAR_API_KEY // Fixed: use x-api-key instead of api_key
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[postCastDirect] API error:', errorText);
        
        // Check for rate limiting
        if (response.status === 429) {
          throw new NeynarError('Rate limit exceeded. Please try again later.', 429);
        }
        
        throw new NeynarError(`Failed to post cast: ${errorText}`, response.status);
      }
      
      const data = await response.json();
      console.log('[postCastDirect] Successfully posted cast');
      
      return data;
    } catch (error) {
      console.error('[postCastDirect] Error:', error);
      if (error instanceof NeynarError) {
        throw error;
      }
      throw new NeynarError(`Failed to post cast: ${(error as Error).message}`, 500);
    }
  });
}

// Export retry function for use in other modules
export { retryWithBackoff }; 