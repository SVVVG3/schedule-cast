import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');
    const signer_uuid = searchParams.get('signer_uuid');
    const username = searchParams.get('username');
    const display_name = searchParams.get('display_name');
    
    console.log('[siwn-complete] Processing SIWN completion:', { fid, signer_uuid, username, display_name });
    
    if (!fid || !signer_uuid) {
      return NextResponse.json({ error: 'Missing required parameters: fid and signer_uuid' }, { status: 400 });
    }
    
    // Store the signer data
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('fid', parseInt(fid))
      .maybeSingle();
    
    if (existingUser?.id) {
      // Update existing user
      const { error: updateError } = await supabase
        .from('users')
        .update({
          signer_uuid: signer_uuid,
          delegated: true,
          username: username || undefined,
          display_name: display_name || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id);
      
      if (updateError) {
        console.error('[siwn-complete] Error updating user:', updateError);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
      }
    } else {
      // Create new user
      const { error: createError } = await supabase
        .from('users')
        .insert({
          fid: parseInt(fid),
          signer_uuid: signer_uuid,
          delegated: true,
          username: username || null,
          display_name: display_name || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (createError) {
        console.error('[siwn-complete] Error creating user:', createError);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }
    }
    
    console.log('[siwn-complete] SIWN completion stored successfully');
    
    // Redirect back to mini app
    return NextResponse.redirect('https://schedule-cast.vercel.app/miniapp?siwn_complete=true');
    
  } catch (error) {
    console.error('[siwn-complete] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 