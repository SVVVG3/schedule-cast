/**
 * Utility to register a managed signer with Neynar
 * 
 * This utility:
 * 1. Creates a new managed signer through Neynar's API
 * 2. Returns the signer UUID and public key for storage
 */

import neynarClient from '@/lib/neynarClient';

interface RegisterUserSignerResult {
  signer_uuid: string;
  public_key: string;
  signer_approval_url: string;
}

/**
 * Get the approval URL for a signer
 * 
 * @param signerUuid - The UUID of the signer to get the approval URL for
 * @returns The signer approval URL or empty string if not found
 */
export async function getSignerApprovalUrl(signerUuid: string, includeDebugLogs: boolean = false): Promise<string> {
  // Setup logging
  const debug = includeDebugLogs 
    ? (message: string, data?: any) => console.log(`[getSignerApprovalUrl] ${message}`, data || '')
    : () => {};
    
  debug('Fetching approval URL for signer:', signerUuid);
  
  try {
    // Get signer details including the approval URL
    const response = await fetch(`https://snapchain-api.neynar.com/v2/farcaster/signer/${signerUuid}`, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.NEYNAR_API_KEY || ''
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      // Check both possible field names for the approval URL
      const approvalUrl = data.approval_url || data.signer_approval_url || '';
      debug('Got approval URL:', approvalUrl);
      return approvalUrl;
    } else {
      debug('Failed to get approval URL, response:', await response.text());
      return '';
    }
  } catch (error) {
    debug('Error fetching approval URL:', error);
    return '';
  }
}

/**
 * Registers a user signer with Neynar using their managed signer service
 * 
 * @param userFid - The Farcaster ID of the user
 * @param options - Additional options
 * @returns The registered signer information
 */
export async function registerUserSigner(
  userFid: number,
  returnPrivateKey: boolean = false,
  options: {
    includeDebugLogs?: boolean;
  } = {}
): Promise<RegisterUserSignerResult> {
  // Destructure options with defaults
  const {
    includeDebugLogs = false,
  } = options;
  
  // Setup logging
  const debug = includeDebugLogs 
    ? (message: string, data?: any) => console.log(`[registerUserSigner] ${message}`, data || '')
    : () => {};
    
  try {
    debug('Starting signer registration for user FID:', userFid);
    
    if (!process.env.NEYNAR_API_KEY) {
      throw new Error('NEYNAR_API_KEY is not set in environment variables');
    }
    
    // Create a new signer using Neynar's managed signer endpoint
    const response = await fetch('https://snapchain-api.neynar.com/v2/farcaster/signer/signed_key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NEYNAR_API_KEY || ''
      },
      body: JSON.stringify({
        fid: userFid,  // Associate the signer with this user's FID
      })
    });
    
    // Parse response
    const responseData = await response.json();
    
    // Handle errors
    if (!response.ok) {
      debug('Error from Neynar API:', responseData);
      throw new Error(`Neynar API error: ${responseData.message || response.statusText}`);
    }
    
    debug('Successfully registered signer:', responseData);
    
    // Get the signer approval URL using the direct API call
    let signerApprovalUrl = '';
    try {
      debug('Fetching signer approval URL');
      signerApprovalUrl = await getSignerApprovalUrl(responseData.signer_uuid, includeDebugLogs);
      debug('Approval URL result:', signerApprovalUrl);
    } catch (error) {
      debug('Error fetching signer approval URL:', error);
      // Continue even if this fails - the signer was created successfully
    }
    
    // Return data
    return {
      signer_uuid: responseData.signer_uuid,
      public_key: responseData.public_key || '',
      signer_approval_url: signerApprovalUrl
    };
  } catch (error) {
    debug('Error registering signer:', error);
    throw error;
  }
} 