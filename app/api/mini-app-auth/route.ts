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

    // Create a managed signer using Neynar API
    console.log('[MiniAppAuth] Creating managed signer for FID:', fid);
    
    const neynarResponse = await fetch('https://api.neynar.com/v2/farcaster/signer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_key': process.env.NEYNAR_API_KEY!,
      },
    });

    if (!neynarResponse.ok) {
      const errorText = await neynarResponse.text();
      console.error('[MiniAppAuth] Failed to create signer:', errorText);
      return NextResponse.json(
        { error: 'Failed to create signer' },
        { status: 500 }
      );
    }

    const signerData = await neynarResponse.json();
    console.log('[MiniAppAuth] Signer created:', signerData);

    // Update user with new signer information
    const { error: updateError } = await supabase
      .from('users')
      .update({
        signer_uuid: signerData.signer_uuid,
        delegated: false, // Will be updated to true when approved
        updated_at: new Date().toISOString(),
      })
      .eq('fid', fid);

    if (updateError) {
      console.error('[MiniAppAuth] Error updating user with signer:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    // Return the approval URL for the user to approve the signer
    return NextResponse.json({
      success: true,
      message: 'Signer created, approval required',
      signer_uuid: signerData.signer_uuid,
      signer_approval_url: signerData.signer_approval_url,
      user: {
        ...userData,
        signer_uuid: signerData.signer_uuid,
        delegated: false,
      },
    });

  } catch (error) {
    console.error('[MiniAppAuth] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 