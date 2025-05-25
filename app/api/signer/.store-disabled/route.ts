import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Endpoint to store a Neynar signer in the user's database record
 * This is called after a successful Sign in with Neynar (SIWN) flow
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      signer_uuid, 
      public_key, 
      status, 
      fid, 
      signer_approval_url 
    } = await request.json();
    
    console.log('[signer/store] Received signer data:', {
      signer_uuid,
      public_key: public_key?.substring(0, 20) + '...',
      status,
      fid,
      signer_approval_url
    });

    // Validate required fields
    if (!signer_uuid || !fid) {
      return NextResponse.json({ 
        error: 'Missing required fields: signer_uuid, fid' 
      }, { status: 400 });
    }

    // Create server Supabase client
    const supabase = createServerSupabaseClient();

    // Check if user exists
    console.log('[signer/store] Checking for existing user with FID:', fid);
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id, fid, signer_uuid, delegated')
      .eq('fid', fid)
      .maybeSingle();
      
    console.log('[signer/store] User lookup result:', { existingUser, error: userError });
    
    let userId;
    let operationType;
    
    if (existingUser?.id) {
      operationType = 'UPDATE';
      // Update existing user with signer info
      console.log('[signer/store] Updating existing user with ID:', existingUser.id);
      console.log('[signer/store] Current user state:', existingUser);
      
      const updateData = {
        signer_uuid: signer_uuid,
        delegated: true,
        username: username || undefined,
        display_name: display_name || undefined,
        updated_at: new Date().toISOString()
      };
      console.log('[signer/store] Update data:', updateData);
      
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', existingUser.id)
        .select()
        .single();
        
      console.log('[signer/store] Update result:', { updatedUser, error: updateError });
        
      if (updateError) {
        console.error('[signer/store] Error updating user:', updateError);
        return NextResponse.json(
          { error: `Failed to update user: ${updateError.message}` },
          { status: 500 }
        );
      }
      
      userId = existingUser.id;
      console.log('[signer/store] User updated successfully. Final user state:', updatedUser);
    } else {
      operationType = 'CREATE';
      // Create new user
      console.log('[signer/store] Creating new user with FID:', fid);
      
      const insertData = {
        fid: fid,
        signer_uuid: signer_uuid,
        delegated: true,
        username: username || null,
        display_name: display_name || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      console.log('[signer/store] Insert data:', insertData);
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert(insertData)
        .select()
        .single();
        
      console.log('[signer/store] Create result:', { newUser, error: createError });
        
      if (createError) {
        console.error('[signer/store] Error creating user:', createError);
        return NextResponse.json(
          { error: `Failed to create user: ${createError.message}` },
          { status: 500 }
        );
      }
      
      userId = newUser.id;
      console.log('[signer/store] User created successfully. New user:', newUser);
    }
    
    const successResponse = {
      success: true,
      message: 'Signer stored successfully',
      operation: operationType,
      user_id: userId,
      fid: fid,
      signer_uuid: signer_uuid
    };
    
    console.log('[signer/store] ===== SUCCESS RESPONSE =====');
    console.log('[signer/store] Response data:', successResponse);
    console.log('[signer/store] ============================');
    
    // Return success with user ID
    return NextResponse.json(successResponse);
  } catch (error) {
    console.error('[signer/store] ===== UNEXPECTED ERROR =====');
    console.error('[signer/store] Error object:', error);
    console.error('[signer/store] Error message:', (error as Error).message);
    console.error('[signer/store] Error stack:', (error as Error).stack);
    console.error('[signer/store] =============================');
    return NextResponse.json(
      { error: `An unexpected error occurred: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 