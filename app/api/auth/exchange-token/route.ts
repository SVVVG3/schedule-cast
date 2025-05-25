import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { code, state } = await request.json();
    
    if (!code) {
      console.error('[exchange-token] Missing authorization code');
      return NextResponse.json({ 
        success: false, 
        error: 'Missing authorization code' 
      }, { status: 400 });
    }
    
    const clientId = process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || '3bc04533-6297-438b-8d85-e655f3fc19f9';
    const clientSecret = process.env.NEYNAR_CLIENT_SECRET;
    const apiKey = process.env.NEYNAR_API_KEY;
    
    if (!clientSecret || !apiKey) {
      console.error('[exchange-token] Missing client secret or API key');
      return NextResponse.json({ 
        success: false, 
        error: 'Server configuration error' 
      }, { status: 500 });
    }
    
    console.log('[exchange-token] Exchanging authorization code for access token');
    
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.neynar.com/v2/farcaster/login/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: 'https://schedule-cast.vercel.app/siwn-bridge'
      })
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[exchange-token] Token exchange failed:', tokenResponse.status, errorText);
      return NextResponse.json({ 
        success: false, 
        error: 'Token exchange failed',
        details: errorText 
      }, { status: tokenResponse.status });
    }
    
    const tokenData = await tokenResponse.json();
    console.log('[exchange-token] Token exchange successful:', tokenData);
    
    // Extract user information from token response
    const { access_token, user } = tokenData;
    
    if (!user || !user.fid) {
      console.error('[exchange-token] No user data in token response');
      return NextResponse.json({ 
        success: false, 
        error: 'No user data received' 
      }, { status: 400 });
    }
    
    // Store user data in our database
    const userData = {
      fid: user.fid,
      signer_uuid: access_token, // Use access token as signer UUID for now
      delegated: true,
      username: user.username || null,
      display_name: user.display_name || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Check if user exists
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('fid', user.fid)
      .maybeSingle();
    
    if (existingUser?.id) {
      // Update existing user
      const { error: updateError } = await supabase
        .from('users')
        .update({
          signer_uuid: access_token,
          delegated: true,
          username: user.username || undefined,
          display_name: user.display_name || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id);
      
      if (updateError) {
        console.error('[exchange-token] Error updating user:', updateError);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to update user data' 
        }, { status: 500 });
      }
      
      console.log('[exchange-token] User updated successfully');
    } else {
      // Create new user
      const { error: createError } = await supabase
        .from('users')
        .insert(userData);
      
      if (createError) {
        console.error('[exchange-token] Error creating user:', createError);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to create user' 
        }, { status: 500 });
      }
      
      console.log('[exchange-token] User created successfully');
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Authentication completed successfully',
      user: {
        fid: user.fid,
        username: user.username,
        display_name: user.display_name
      }
    });
    
  } catch (error) {
    console.error('[exchange-token] Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to exchange authorization code',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 