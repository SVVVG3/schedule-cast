/**
 * Utility to register a mnemonic-derived signer with Neynar
 * 
 * This utility:
 * 1. Derives a keypair for a user from the developer mnemonic
 * 2. Registers the public key with Neynar
 * 3. Returns the signer UUID and public key for storage
 */

import { mnemonicToAccount, publicKeyToAddress } from 'viem/accounts';
import { getFid } from './getFid';
import { hexToBytes, bytesToHex } from 'viem';
import neynarClient from '@/lib/neynarClient';

interface RegisterUserSignerResult {
  signer_uuid: string;
  public_key: string;
  private_key?: string; // Only included if returnPrivateKey is true (DEV only)
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
 * Registers a user signer with Neynar using the dev mnemonic
 * 
 * @param userFid - The Farcaster ID of the user, used as derivation index
 * @param returnPrivateKey - Whether to return the private key (for testing only)
 * @param options - Additional options
 * @returns The registered signer information
 */
export async function registerUserSigner(
  userFid: number,
  returnPrivateKey: boolean = false,
  options: {
    customDerivationIndex?: number;
    includeDebugLogs?: boolean;
  } = {}
): Promise<RegisterUserSignerResult> {
  // Destructure options with defaults
  const {
    customDerivationIndex,
    includeDebugLogs = false,
  } = options;
  
  // Setup logging
  const debug = includeDebugLogs 
    ? (message: string, data?: any) => console.log(`[registerUserSigner] ${message}`, data || '')
    : () => {};
    
  try {
    debug('Starting signer registration for user FID:', userFid);
    
    // 1. Check for developer mnemonic
    const mnemonic = process.env.FARCASTER_DEVELOPER_MNEMONIC;
    if (!mnemonic) {
      throw new Error('FARCASTER_DEVELOPER_MNEMONIC is not set in environment variables');
    }

    // 2. Get app FID from mnemonic (needed for registration)
    const appFid = await getFid();
    debug('Retrieved app FID:', appFid);
    
    // 3. Derive user account from mnemonic
    // Use either a custom index or the user's FID as the derivation index
    const derivationIndex = customDerivationIndex ?? userFid;
    
    debug('Deriving keypair with index:', derivationIndex);
    const account = mnemonicToAccount(mnemonic, { accountIndex: derivationIndex });
    
    const publicKey = account.publicKey;
    const address = publicKeyToAddress(publicKey);
    
    debug('Derived public key:', publicKey);
    debug('Derived address:', address);

    // 4. Register signer with Neynar
    debug('Registering with Neynar API');
    
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
      // Note: For managed signers, we don't need to provide the public key
      // Neynar will generate a signer and return the approval URL
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
    
    // 5. Get the signer approval URL using the direct API call
    // The SDK doesn't have a dedicated method for this, so we'll use fetch
    let signerApprovalUrl = '';
    try {
      debug('Fetching signer approval URL');
      signerApprovalUrl = await getSignerApprovalUrl(responseData.signer_uuid, includeDebugLogs);
      debug('Approval URL result:', signerApprovalUrl);
    } catch (error) {
      debug('Error fetching signer approval URL:', error);
      // Continue even if this fails - the signer was created successfully
    }
    
    // 6. Return data
    return {
      signer_uuid: responseData.signer_uuid,
      public_key: responseData.public_key || publicKey, // Use Neynar's public key if available
      // We can't return the private key directly from the account object
      // Instead, we'd need to use the mnemonic and derivation index again
      // Only for testing, should not be used in production
      private_key: returnPrivateKey ? `PRIVATE_KEY_OMITTED_FOR_SECURITY` : undefined,
      signer_approval_url: signerApprovalUrl
    };
  } catch (error) {
    debug('Error registering signer:', error);
    throw error;
  }
} 