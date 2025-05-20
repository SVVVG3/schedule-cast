import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createSigner } from '@/lib/neynar';

// Test endpoint to directly insert a user and signer
// This bypasses our normal auth flow for debugging
export async function POST(request: Request) {
  try {
    // Parse request body
    const { fid } = await request.json();
    
    if (!fid) {
      return NextResponse.json(
        { error: 'FID is required' },
        { status: 400 }
      );
    }
    
    console.log('[test-user-insert] Attempting to create user for FID:', fid);
    
    // First check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, fid, signer_uuid')
      .eq('fid', fid)
      .maybeSingle();
    
    console.log('[test-user-insert] Check result:', { existingUser, error: checkError });
    
    let userId;
    let signerUuid;
    
    // If user doesn't exist, create it
    if (!existingUser) {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          fid: fid,
          username: `test_user_${fid}`,
          display_name: `Test User ${fid}`
        })
        .select('id')
        .single();
      
      if (insertError) {
        console.error('[test-user-insert] Error creating user:', insertError);
        return NextResponse.json({ 
          error: 'Failed to create user', 
          details: insertError 
        }, { status: 500 });
      }
      
      userId = newUser.id;
      console.log('[test-user-insert] Created new user with ID:', userId);
    } else {
      userId = existingUser.id;
      signerUuid = existingUser.signer_uuid;
      console.log('[test-user-insert] Found existing user:', { userId, signerUuid });
    }
    
    // If no signer, create one
    if (!signerUuid) {
      try {
        console.log('[test-user-insert] Creating signer for FID:', fid);
        const signerData = await createSigner(fid);
        signerUuid = signerData.signer_uuid;
        
        // Update user with signer
        const { error: updateError } = await supabase
          .from('users')
          .update({ signer_uuid: signerUuid })
          .eq('id', userId);
        
        if (updateError) {
          console.error('[test-user-insert] Error updating signer:', updateError);
          return NextResponse.json({ 
            error: 'Failed to update user with signer', 
            details: updateError 
          }, { status: 500 });
        }
        
        console.log('[test-user-insert] Updated user with signer:', signerUuid);
      } catch (error) {
        console.error('[test-user-insert] Error creating signer:', error);
        return NextResponse.json({ 
          error: 'Failed to create signer', 
          details: (error as Error).message 
        }, { status: 500 });
      }
    }
    
    // Get the final user record
    const { data: finalUser, error: finalError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (finalError) {
      console.error('[test-user-insert] Error getting final user:', finalError);
      return NextResponse.json({ 
        error: 'Failed to get final user', 
        details: finalError 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'User created/updated successfully',
      user: finalUser
    });
    
  } catch (error) {
    console.error('[test-user-insert] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: (error as Error).message },
      { status: 500 }
    );
  }
} 