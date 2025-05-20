import { supabase } from './supabase';
import { createSigner } from './neynar';

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
      username: neynarUser.username || '',
      display_name: neynarUser.displayName || '',
      custody_address: neynarUser.custody_address || '',
      avatar_url: neynarUser.pfp?.url || '',
      signer_uuid: neynarUser.signerUuid || null,
    };
    
    console.log('[syncUserToSupabase] User data to save:', userData);

    // Check if user already exists by FID
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('id')
      .eq('fid', userData.fid)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      console.error('[syncUserToSupabase] Error finding user:', findError);
      return null;
    }

    console.log('[syncUserToSupabase] Existing user check result:', { existingUser, findError });

    if (existingUser) {
      // Update existing user
      console.log('[syncUserToSupabase] Updating existing user with ID:', existingUser.id);
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(userData)
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateError) {
        console.error('[syncUserToSupabase] Error updating user:', updateError);
        return null;
      }

      console.log('[syncUserToSupabase] Updated user:', updatedUser);
      return updatedUser;
    } else {
      // Create new user
      console.log('[syncUserToSupabase] Creating new user');
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (insertError) {
        console.error('[syncUserToSupabase] Error creating user:', insertError);
        return null;
      }

      console.log('[syncUserToSupabase] Created new user:', newUser);
      return newUser;
    }
  } catch (error) {
    console.error('[syncUserToSupabase] Error syncing user to Supabase:', error);
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
      return user.signer_uuid;
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