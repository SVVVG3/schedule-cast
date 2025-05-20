import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Endpoint to store a Neynar signer in the user's database record
 * This is called after a successful Sign in with Neynar (SIWN) flow
 */
export async function POST(request: Request) {
  try {
    console.log('[signer/store] Processing request');
    
    // Parse request body
    const { fid, signer_uuid, username, display_name } = await request.json();
    console.log('[signer/store] Request data:', { fid, signer_uuid, username, display_name });
    
    // Validation
    if (!fid || !signer_uuid) {
      return NextResponse.json(
        { error: 'Missing required parameters: fid and signer_uuid' },
        { status: 400 }
      );
    }
    
    // Check if user exists
    console.log('[signer/store] Checking for existing user with FID:', fid);
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('fid', fid)
      .maybeSingle();
      
    console.log('[signer/store] User lookup result:', { existingUser, error: userError });
    
    let userId;
    
    if (existingUser?.id) {
      // Update existing user with signer info
      console.log('[signer/store] Updating existing user with ID:', existingUser.id);
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          signer_uuid: signer_uuid,
          // The SIWN flow already takes care of delegation, so we can set delegated to true
          delegated: true,
          // Update other fields if provided
          username: username || undefined,
          display_name: display_name || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select()
        .single();
        
      if (updateError) {
        console.error('[signer/store] Error updating user:', updateError);
        return NextResponse.json(
          { error: `Failed to update user: ${updateError.message}` },
          { status: 500 }
        );
      }
      
      userId = existingUser.id;
      console.log('[signer/store] User updated successfully');
    } else {
      // Create new user
      console.log('[signer/store] Creating new user with FID:', fid);
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          fid: fid,
          signer_uuid: signer_uuid,
          delegated: true, // The user has already approved the signer via SIWN
          username: username || null,
          display_name: display_name || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (createError) {
        console.error('[signer/store] Error creating user:', createError);
        return NextResponse.json(
          { error: `Failed to create user: ${createError.message}` },
          { status: 500 }
        );
      }
      
      userId = newUser.id;
      console.log('[signer/store] User created successfully');
    }
    
    // Return success with user ID
    return NextResponse.json({
      success: true,
      message: 'Signer stored successfully',
      user_id: userId,
      fid: fid,
      signer_uuid: signer_uuid
    });
  } catch (error) {
    console.error('[signer/store] Unexpected error:', error);
    return NextResponse.json(
      { error: `An unexpected error occurred: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 