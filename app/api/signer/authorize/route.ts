import { NextResponse } from 'next/server';

/**
 * Redirect users to Neynar's authorization flow
 * This is the correct way to get signers approved
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');
    
    if (!fid) {
      return NextResponse.json({ error: 'FID is required' }, { status: 400 });
    }

    // Use Neynar's proper authorization URL
    // This is the correct approach for getting write permissions
    const authUrl = `https://app.neynar.com/login?client_id=${process.env.NEYNAR_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.NEYNAR_REDIRECT_URI || 'https://schedule-cast.vercel.app/auth/callback')}&response_type=code&scope=write`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('[authorize] Error:', error);
    return NextResponse.json(
      { error: `Authorization error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

/**
 * Get authorization URL without redirect
 */
export async function POST(request: Request) {
  try {
    const { fid } = await request.json();
    
    if (!fid) {
      return NextResponse.json({ error: 'FID is required' }, { status: 400 });
    }

    // Return the authorization URL instead of broken deeplinks
    const authUrl = `https://app.neynar.com/login?client_id=${process.env.NEYNAR_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.NEYNAR_REDIRECT_URI || 'https://schedule-cast.vercel.app/auth/callback')}&response_type=code&scope=write`;

    return NextResponse.json({
      success: true,
      authorization_url: authUrl,
      fid,
      instructions: "Visit the authorization URL to grant Schedule-Cast permission to post on your behalf",
      message: "This is the correct authorization flow for Neynar"
    });
  } catch (error) {
    console.error('[authorize] Error:', error);
    return NextResponse.json(
      { error: `Authorization error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 