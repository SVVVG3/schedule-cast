import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID;
    
    if (!clientId) {
      console.error('[get-auth-url] Missing NEXT_PUBLIC_NEYNAR_CLIENT_ID');
      return NextResponse.json({ 
        error: 'Server configuration error - missing client ID' 
      }, { status: 500 });
    }

    console.log('[get-auth-url] Generating authorization URL...');

    // Build the authorization URL following Neynar's SIWN documentation
    const redirectUri = encodeURIComponent('https://schedule-cast.vercel.app/api/siwn-complete');
    const authorizationUrl = `https://app.neynar.com/login?client_id=${clientId}&redirect_uri=${redirectUri}`;
    
    console.log('[get-auth-url] Authorization URL:', authorizationUrl);

    return NextResponse.json({
      success: true,
      authorizationUrl,
      clientId,
      redirectUri: 'https://schedule-cast.vercel.app/api/siwn-complete'
    });

  } catch (error) {
    console.error('[get-auth-url] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error generating authorization URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 