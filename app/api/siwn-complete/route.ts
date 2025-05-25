import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Log EVERYTHING that Neynar sends us
    console.log('[siwn-complete] ===== NEYNAR REDIRECT DEBUG =====');
    console.log('[siwn-complete] Full URL:', request.url);
    console.log('[siwn-complete] All search params:', Object.fromEntries(searchParams.entries()));
    console.log('[siwn-complete] Headers:', Object.fromEntries(request.headers.entries()));
    console.log('[siwn-complete] Method:', request.method);
    console.log('[siwn-complete] =====================================');
    
    const fid = searchParams.get('fid');
    const signer_uuid = searchParams.get('signer_uuid');
    const username = searchParams.get('username');
    const display_name = searchParams.get('display_name');
    
    // Also check for alternative parameter names that Neynar might use
    const alt_fid = searchParams.get('user_fid') || searchParams.get('userFid');
    const alt_signer = searchParams.get('signerUuid') || searchParams.get('signer');
    const token = searchParams.get('token') || searchParams.get('access_token');
    
    console.log('[siwn-complete] Standard params:', { fid, signer_uuid, username, display_name });
    console.log('[siwn-complete] Alternative params:', { alt_fid, alt_signer, token });
    
    const finalFid = fid || alt_fid;
    const finalSigner = signer_uuid || alt_signer;
    
    if (!finalFid || !finalSigner) {
      console.log('[siwn-complete] Missing required data');
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required authentication data',
        received: { fid: finalFid, signer_uuid: finalSigner }
      }, { status: 400 });
    }
    
    console.log('[siwn-complete] Processing with:', { fid: finalFid, signer_uuid: finalSigner });
    
    // Create Supabase client inside function
    
    // Store the signer data
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('fid', parseInt(finalFid))
      .maybeSingle();
    
    console.log('[siwn-complete] User lookup result:', { existingUser, error: userError });
    
    if (existingUser?.id) {
      // Update existing user
      const updateData = {
        signer_uuid: finalSigner,
        delegated: true,
        username: username || undefined,
        display_name: display_name || undefined,
        updated_at: new Date().toISOString()
      };
      
      console.log('[siwn-complete] Updating user:', existingUser.id, 'with data:', updateData);
      
      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', existingUser.id);
      
      if (updateError) {
        console.error('[siwn-complete] Error updating user:', updateError);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to update user',
          details: updateError 
        }, { status: 500 });
      }
      
      console.log('[siwn-complete] User updated successfully');
    } else {
      // Create new user
      const insertData = {
        fid: parseInt(finalFid),
        signer_uuid: finalSigner,
        delegated: true,
        username: username || null,
        display_name: display_name || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('[siwn-complete] Creating new user with data:', insertData);
      
      const { error: createError } = await supabase
        .from('users')
        .insert(insertData);
      
      if (createError) {
        console.error('[siwn-complete] Error creating user:', createError);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to create user',
          details: createError 
        }, { status: 500 });
      }
      
      console.log('[siwn-complete] User created successfully');
    }
    
    console.log('[siwn-complete] SIWN completion stored successfully');
    
    // Create the redirect URL back to the mini app with success parameters
    const redirectUrl = new URL('https://schedule-cast.vercel.app/');
    redirectUrl.searchParams.set('siwn_complete', 'true');
    redirectUrl.searchParams.set('fid', finalFid);
    redirectUrl.searchParams.set('signer_uuid', finalSigner);
    if (username) redirectUrl.searchParams.set('username', username);
    if (display_name) redirectUrl.searchParams.set('display_name', display_name);
    
    console.log('[siwn-complete] Redirecting back to app:', redirectUrl.toString());
    
    // Redirect back to the mini app with success data
    return NextResponse.redirect(redirectUrl.toString(), 302);
    
  } catch (error) {
    console.error('[siwn-complete] Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Unexpected error during authentication',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 