import { supabase } from './supabase';
import { createSigner, validateAndRefreshSigner } from './neynar';

// Define a type for the SIWN user data
interface NeynarUser {
  fid: number;
  username: string;
  displayName?: string;
  pfp?: {
    url?: string;
  };
  custody_address?: string;
  signerUuid?: string;
}

/**
 * Syncs a Neynar SIWN user to our Supabase database
 * Called after successful authentication with Sign In With Neynar
 */
export async function syncUserToSupabase(neynarUser: NeynarUser) {
  if (!neynarUser || !neynarUser.fid) {
    console.error('[syncUserToSupabase] No valid Farcaster user to sync');
    return null;
  }

  try {
    console.log('[syncUserToSupabase] Neynar SIWN user data:', neynarUser);
    
    // Prepare user data from Neynar's SIWN info
    const userData = {
      fid: neynarUser.fid,
      username: neynarUser.username,
      display_name: neynarUser.displayName || neynarUser.username,
      avatar: neynarUser.pfp?.url || null,
      custody_address: neynarUser.custody_address || null,
      signer_uuid: neynarUser.signerUuid || null,
      signer_status: neynarUser.signerUuid ? 'approved' : null,
      needs_signer_approval: !neynarUser.signerUuid,
      last_signer_check: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('[syncUserToSupabase] Prepared user data:', userData);

    // Upsert user to our database
    const { data, error } = await supabase
      .from('users')
      .upsert(userData, { 
        onConflict: 'fid',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      console.error('[syncUserToSupabase] Database error:', error);
      throw error;
    }

    console.log('[syncUserToSupabase] User synced successfully:', data.fid);
    return data;
  } catch (error) {
    console.error('[syncUserToSupabase] Failed to sync user:', error);
    return null;
  }
}

/**
 * Gets a user from the database by their FID
 */
export async function getUserByFid(fid: number) {
  try {
    console.log(`[getUserByFid] Fetching user with FID: ${fid}, type: ${typeof fid}`);
    
    // Ensure FID is treated as a number
    const numericFid = typeof fid === 'string' ? parseInt(fid, 10) : fid;
    
    // Use maybeSingle() instead of single() to avoid 406 errors when no results are found
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('fid', numericFid)
      .maybeSingle();

    if (error) {
      console.error('[getUserByFid] Error fetching user by FID:', error);
      return null;
    }
    
    console.log('[getUserByFid] Query successful, result:', data ? 'User found' : 'No user found');
    return data;
  } catch (error) {
    console.error('[getUserByFid] Exception fetching user by FID:', error);
    return null;
  }
}

/**
 * Gets or creates a signer for a user
 * 
 * @param fid The Farcaster ID of the user
 * @returns The signer UUID
 */
export async function getOrCreateSigner(fid: number) {
  console.log('[getOrCreateSigner] Starting for FID:', fid);
  
  if (!fid) {
    console.error('[getOrCreateSigner] Invalid FID provided:', fid);
    return null;
  }
  
  try {
    // Check if user already has a signer
    console.log('[getOrCreateSigner] Checking for existing user and signer');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('signer_uuid, id')
      .eq('fid', fid)
      .single();

    if (userError) {
      if (userError.code === 'PGRST116') {
        // No user found, need to create one
        console.log('[getOrCreateSigner] No user found, will create user with signer');
        
        // First create a minimal user record
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({ 
            fid: fid, 
            username: '', 
            display_name: ''
          })
          .select('id')
          .single();
          
        if (insertError) {
          console.error('[getOrCreateSigner] Failed to create user:', insertError);
          return null;
        }
        
        console.log('[getOrCreateSigner] Created new user with ID:', newUser?.id);
        
        // Now create a signer for this user
        return await createAndAttachSigner(fid);
      } else {
        console.error('[getOrCreateSigner] Error fetching user:', userError);
        return null;
      }
    }

    // If the user already has a signer, return it
    if (user?.signer_uuid) {
      console.log('[getOrCreateSigner] Found existing signer:', user.signer_uuid);
      
      // Validate the signer and refresh if needed
      try {
        console.log('[getOrCreateSigner] Validating existing signer...');
        const { signerUuid, refreshed } = await validateAndRefreshSigner(user.signer_uuid, fid);
        
        if (refreshed) {
          console.log('[getOrCreateSigner] Signer was invalid and has been refreshed:', signerUuid);
        } else {
          console.log('[getOrCreateSigner] Existing signer is valid, no refresh needed');
        }
        
        return signerUuid;
      } catch (validationError) {
        console.error('[getOrCreateSigner] Error validating signer:', validationError);
        // If validation fails, we'll fall through to creating a new signer
      }
    }

    console.log('[getOrCreateSigner] User exists but has no signer, creating one');
    return await createAndAttachSigner(fid);
  } catch (error) {
    console.error('[getOrCreateSigner] Exception:', error);
    return null;
  }
}

/**
 * Helper function to create a signer and attach it to a user
 */
async function createAndAttachSigner(fid: number) {
  try {
    console.log('[createAndAttachSigner] Creating signer for FID:', fid);
    const signerData = await createSigner(fid);
    const signerUuid = signerData.signer_uuid;
    console.log('[createAndAttachSigner] Created signer UUID:', signerUuid);

    // Update the user with the new signer_uuid
    console.log('[createAndAttachSigner] Updating user with signer UUID');
    const { error: updateError } = await supabase
      .from('users')
      .update({ signer_uuid: signerUuid })
      .eq('fid', fid);

    if (updateError) {
      console.error('[createAndAttachSigner] Error updating user with signer UUID:', updateError);
      return null;
    }

    console.log('[createAndAttachSigner] Successfully attached signer to user');
    return signerUuid;
  } catch (error) {
    console.error('[createAndAttachSigner] Error:', error);
    return null;
  }
} 