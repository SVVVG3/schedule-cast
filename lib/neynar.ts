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

// Return type for validateAndRefreshSigner
export interface SignerValidationResult {
  signerUuid: string;
  refreshed: boolean;
  approved: boolean;
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
      client_id: process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || '3bc04533-6297-438b-8d85-e655f3fc19f9'
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
 * @param skipTestPost Whether to skip posting actual test casts (default: false)
 * @returns An object with the valid signer UUID and whether it was refreshed
 */
export async function validateAndRefreshSigner(signerUuid: string, fid: number, skipTestPost: boolean = false): Promise<SignerValidationResult> {
  if (!process.env.NEYNAR_API_KEY) {
    throw new NeynarError('Neynar API key is missing', 500);
  }

  if (!signerUuid || !fid) {
    throw new NeynarError('Signer UUID and FID are required', 400);
  }

  console.log(`[validateAndRefreshSigner] Validating signer ${signerUuid} for FID ${fid} (skipTestPost: ${skipTestPost})`);
  
  try {
    // For SIWN signers, we'll assume they're valid if they exist in our database
    // and only test posting capability when explicitly requested
    if (skipTestPost) {
      console.log(`[validateAndRefreshSigner] Skipping test post - assuming SIWN signer is valid`);
      return {
        signerUuid: signerUuid,
        refreshed: false,
        approved: true
      };
    }
    
    // Only perform actual posting test when explicitly requested (e.g., from approval-status endpoint)
    try {
      console.log(`[validateAndRefreshSigner] Testing posting capability for signer ${signerUuid}`);
      
      // Try to post a test cast to verify the signer works
      const testCast = await postCastDirect(
        signerUuid,
        `🧪 Signer validation test - ${new Date().toISOString().slice(0, 19)} (this cast verifies your signer is working)`
      );
      
      if (testCast?.hash) {
        console.log(`[validateAndRefreshSigner] SIWN signer ${signerUuid} can post successfully`);
        return {
          signerUuid: signerUuid,
          refreshed: false,
          approved: true
        };
      } else {
        console.log(`[validateAndRefreshSigner] Test post failed - no hash returned`);
        throw new NeynarError('Test post failed', 400);
      }
    } catch (postError: any) {
      console.log(`[validateAndRefreshSigner] Test post failed:`, postError.message);
      
      // If the test post fails, try to create a new signer
      if (postError.message?.includes('SignerNotApproved') || postError.status === 401) {
        console.log(`[validateAndRefreshSigner] Signer needs approval, checking for other valid signers...`);
        
        // Check if user has any other signers in the database
        const { data: userData } = await supabase
          .from('users')
          .select('signer_uuid')
          .eq('fid', fid)
          .single();
          
        if (userData?.signer_uuid && userData.signer_uuid !== signerUuid) {
          console.log(`[validateAndRefreshSigner] Found different signer in database: ${userData.signer_uuid}`);
          
          // Test the database signer
          try {
            const dbTestCast = await postCastDirect(
              userData.signer_uuid,
              `🧪 Database signer test - ${new Date().toISOString().slice(0, 19)}`
            );
            
            if (dbTestCast?.hash) {
              console.log(`[validateAndRefreshSigner] Database signer ${userData.signer_uuid} works`);
              return {
                signerUuid: userData.signer_uuid,
                refreshed: true,
                approved: true
              };
            }
          } catch (dbSignerError: any) {
            console.log(`[validateAndRefreshSigner] Database signer also doesn't work:`, dbSignerError.message);
          }
        }
        
        // Create a new signer as last resort
        console.log(`[validateAndRefreshSigner] No valid approved signer found, creating new signer for FID ${fid}`);
        const newSignerData = await createSignerDirect();
        
        // Update the user's signer information
        await supabase
          .from('users')
          .update({
            signer_uuid: newSignerData.signer_uuid,
            signer_status: newSignerData.status || 'generated',
            signer_approval_url: newSignerData.signer_approval_url || null,
            needs_signer_approval: newSignerData.status !== 'approved',
            last_signer_check: new Date().toISOString()
          })
          .eq('fid', fid);
        
        console.log(`[validateAndRefreshSigner] New signer created: ${newSignerData.signer_uuid}, status: ${newSignerData.status}`);
        
        if (newSignerData.status === 'approved') {
          return {
            signerUuid: newSignerData.signer_uuid,
            refreshed: true,
            approved: true
          };
        } else {
          throw new NeynarError(
            `Signer needs approval. Please visit: ${newSignerData.signer_approval_url}`,
            403
          );
        }
      } else {
        throw postError;
      }
    }
  } catch (error) {
    console.error(`[validateAndRefreshSigner] Error:`, error);
    throw error instanceof NeynarError ? error : new NeynarError(`Unexpected error: ${(error as Error).message}`, 500);
  }
  
  // This should never be reached, but TypeScript requires it
  throw new NeynarError('Unknown error in validateAndRefreshSigner', 500);
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
 * Extract URLs from text content
 */
function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches || [];
}

/**
 * Post a cast via direct Neynar API call with retry logic
 * This bypasses the SDK due to API changes and includes rate limit handling
 */
export async function postCastDirect(
  signerUuid: string,
  content: string,
  channelId?: string,
  mediaUrls?: string[]
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
        client_id: process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || '3bc04533-6297-438b-8d85-e655f3fc19f9'
      };

      // Add channel ID if provided
      if (channelId) {
        requestBody.channel_id = channelId;
      }
      
      // Collect all embeds (media + URLs from content)
      const allEmbeds: string[] = [];
      
      // Add media URLs if provided
      if (mediaUrls && mediaUrls.length > 0) {
        allEmbeds.push(...mediaUrls);
        console.log('[postCastDirect] Including media embeds:', mediaUrls);
      }
      
      // Extract and add URLs from cast content for automatic embed detection
      const contentUrls = extractUrls(content);
      if (contentUrls.length > 0) {
        allEmbeds.push(...contentUrls);
        console.log('[postCastDirect] Auto-detected URLs for embeds:', contentUrls);
      }
      
      // Add embeds to request if we have any
      if (allEmbeds.length > 0) {
        // Farcaster allows max 2 embeds, prioritize media then content URLs
        const limitedEmbeds = allEmbeds.slice(0, 2);
        requestBody.embeds = limitedEmbeds.map(url => ({ url }));
        console.log('[postCastDirect] Final embeds being sent:', requestBody.embeds);
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