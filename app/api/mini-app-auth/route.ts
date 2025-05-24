import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface MiniAppAuthRequest {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { fid, username, displayName, pfpUrl }: MiniAppAuthRequest = await request.json();

    console.log('[MiniAppAuth] Received auth request for FID:', fid);

    if (!fid) {
      return NextResponse.json(
        { error: 'FID is required' },
        { status: 400 }
      );
    }

    // Check if user already exists in our database
    let { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('fid', fid)
      .maybeSingle();

    if (fetchError) {
      console.error('[MiniAppAuth] Error fetching user:', fetchError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    // If user doesn't exist, create them
    if (!userData) {
      console.log('[MiniAppAuth] Creating new user for FID:', fid);
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          fid: fid,
          username: username || `user${fid}`,
          display_name: displayName,
          avatar: pfpUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error('[MiniAppAuth] Error creating user:', createError);
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }

      userData = newUser;
    }

    // Check if user already has an approved signer
    if (userData.signer_uuid && userData.delegated) {
      console.log('[MiniAppAuth] User already has approved signer:', userData.signer_uuid);
      return NextResponse.json({
        success: true,
        message: 'User already has approved signer',
        user: userData,
      });
    }

    // For mini app users, we need to direct them to use SIWN
    // Since SIWN creates the signer and gets it approved in one flow
    console.log('[MiniAppAuth] User needs SIWN authentication for signer creation');
    
    return NextResponse.json({
      success: false,
      needsSIWN: true,
      message: 'User needs to complete SIWN authentication to get signer permissions',
      user: userData,
    });

  } catch (error) {
    console.error('[MiniAppAuth] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 