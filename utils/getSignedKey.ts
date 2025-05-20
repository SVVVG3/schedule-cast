/**
 * Utility to get a signed key from Neynar using their managed signer approach
 * 
 * This utility has been updated to use Neynar's managed signer approach
 * and no longer requires the developer mnemonic or getFid helper.
 */

import neynarClient from "@/lib/neynarClient";
import { registerUserSigner } from "./registerUserSigner";

/**
 * Creates a new managed signer via Neynar
 * This is a simple wrapper around the registerUserSigner utility
 * 
 * @param fid Optional Farcaster ID to associate with the signer
 * @returns The signed key information
 */
export const getSignedKey = async (fid?: number) => {
  try {
    console.log('[getSignedKey] Creating managed signer via Neynar');
    
    // If no FID is provided, create an app signer (not associated with a user)
    if (!fid) {
      console.log('[getSignedKey] No FID provided, creating app signer');
      // Use Neynar client directly to create a signer not associated with a specific user
      const signer = await neynarClient.createSigner();
      console.log('[getSignedKey] App signer created:', signer.signer_uuid);
      return signer;
    }
    
    // Create a user-specific signer
    console.log('[getSignedKey] Creating signer for FID:', fid);
    const signerInfo = await registerUserSigner(fid, false, { includeDebugLogs: true });
    
    console.log('[getSignedKey] User signer created:', signerInfo.signer_uuid);
    return {
      signer_uuid: signerInfo.signer_uuid,
      public_key: signerInfo.public_key,
      signer_approval_url: signerInfo.signer_approval_url
    };
  } catch (error) {
    console.error('[getSignedKey] Error creating signer:', error);
    throw error;
  }
}; 