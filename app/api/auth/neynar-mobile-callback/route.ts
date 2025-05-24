import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  console.log('[Neynar Mobile Callback] Received params:', { code: !!code, state, error });

  if (error) {
    console.error('[Neynar Mobile Callback] OAuth error:', error);
    return NextResponse.redirect(new URL(`${request.nextUrl.origin}?error=${encodeURIComponent(error)}`, request.url));
  }

  if (!code || state !== 'siwn_mobile') {
    console.error('[Neynar Mobile Callback] Missing or invalid parameters');
    return NextResponse.redirect(new URL(`${request.nextUrl.origin}?error=invalid_request`, request.url));
  }

  try {
    const clientId = process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || '3bc04533-6297-438b-8d85-e655f3fc19f9';
    const clientSecret = process.env.NEYNAR_CLIENT_SECRET;
    
    if (!clientSecret) {
      console.error('[Neynar Mobile Callback] Missing NEYNAR_CLIENT_SECRET');
      return NextResponse.redirect(new URL(`${request.nextUrl.origin}?error=server_error`, request.url));
    }

    // Exchange authorization code for access token and signer
    const tokenResponse = await fetch('https://app.neynar.com/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `${request.nextUrl.origin}${request.nextUrl.pathname}`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[Neynar Mobile Callback] Token exchange failed:', errorText);
      return NextResponse.redirect(new URL(`${request.nextUrl.origin}?error=token_exchange_failed`, request.url));
    }

    const tokenData = await tokenResponse.json();
    console.log('[Neynar Mobile Callback] Token data received:', Object.keys(tokenData));

    // The token response should contain user data and signer information
    if (tokenData.fid && tokenData.signer_uuid) {
      // Create a success URL with the auth data as URL params (for client-side processing)
      const successUrl = new URL(request.nextUrl.origin);
      successUrl.searchParams.set('siwn_success', 'true');
      successUrl.searchParams.set('fid', tokenData.fid.toString());
      successUrl.searchParams.set('signer_uuid', tokenData.signer_uuid);
      
      if (tokenData.user) {
        successUrl.searchParams.set('user_data', encodeURIComponent(JSON.stringify(tokenData.user)));
      }

      console.log('[Neynar Mobile Callback] Redirecting to success with auth data');
      return NextResponse.redirect(successUrl);
    } else {
      console.error('[Neynar Mobile Callback] Missing required auth data in response');
      return NextResponse.redirect(new URL(`${request.nextUrl.origin}?error=invalid_response`, request.url));
    }

  } catch (error) {
    console.error('[Neynar Mobile Callback] Unexpected error:', error);
    return NextResponse.redirect(new URL(`${request.nextUrl.origin}?error=server_error`, request.url));
  }
} 