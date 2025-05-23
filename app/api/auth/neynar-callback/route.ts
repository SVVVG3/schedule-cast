import { NextResponse } from 'next/server';

/**
 * Handle Neynar OAuth callback
 * Exchange auth code for user data and signer
 */
export async function POST(request: Request) {
  try {
    const { code, state } = await request.json();
    
    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Missing auth code' },
        { status: 400 }
      );
    }
    
    console.log('[neynar-callback] Processing auth code:', code);
    
    const clientId = process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || '3bc04533-6297-438b-8d85-e655f3fc19f9';
    const redirectUri = process.env.NEXT_PUBLIC_APP_URL || 'https://schedule-cast.vercel.app';
    
    // Exchange code for access token with Neynar
    const tokenResponse = await fetch('https://api.neynar.com/v2/farcaster/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[neynar-callback] Token exchange failed:', errorText);
      return NextResponse.json(
        { success: false, error: 'Failed to exchange auth code for token' },
        { status: 400 }
      );
    }
    
    const tokenData = await tokenResponse.json();
    console.log('[neynar-callback] Token exchange successful');
    
    // The token response should contain user and signer data
    if (tokenData.fid && tokenData.signer_uuid) {
      console.log('[neynar-callback] Auth successful for FID:', tokenData.fid);
      
      // Store the signer in Supabase
      try {
        const storeResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://schedule-cast.vercel.app'}/api/signer/store`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fid: tokenData.fid,
            signer_uuid: tokenData.signer_uuid,
            username: tokenData.user?.username,
            display_name: tokenData.user?.display_name || tokenData.user?.displayName
          }),
        });
        
        if (!storeResponse.ok) {
          console.error('[neynar-callback] Failed to store signer');
        } else {
          console.log('[neynar-callback] Signer stored successfully');
        }
      } catch (error) {
        console.error('[neynar-callback] Error storing signer:', error);
      }
      
      return NextResponse.json({
        success: true,
        fid: tokenData.fid,
        signer_uuid: tokenData.signer_uuid,
        user: tokenData.user
      });
    } else {
      console.error('[neynar-callback] Invalid token response:', tokenData);
      return NextResponse.json(
        { success: false, error: 'Invalid response from Neynar' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('[neynar-callback] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 