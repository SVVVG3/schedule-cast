import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const signerUuid = searchParams.get('signer_uuid');
    
    if (!signerUuid) {
      console.error('[signer-status] Missing required parameter: signer_uuid');
      return NextResponse.json({ 
        error: 'Missing required parameter: signer_uuid' 
      }, { status: 400 });
    }

    const apiKey = process.env.NEYNAR_API_KEY;
    
    if (!apiKey) {
      console.error('[signer-status] Missing NEYNAR_API_KEY');
      return NextResponse.json({ 
        error: 'Server configuration error' 
      }, { status: 500 });
    }

    console.log('[signer-status] Checking status for signer:', signerUuid);

    // Check signer status using Neynar's API
    const response = await fetch(`https://api.neynar.com/v2/farcaster/signer?signer_uuid=${signerUuid}`, {
      method: 'GET',
      headers: {
        'api_key': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[signer-status] Failed to check signer status:', errorText);
      return NextResponse.json({ 
        error: 'Failed to check signer status',
        details: errorText
      }, { status: response.status });
    }

    const signerData = await response.json();
    console.log('[signer-status] Signer status:', signerData.status);

    return NextResponse.json({
      success: true,
      signer_uuid: signerData.signer_uuid,
      status: signerData.status,
      fid: signerData.fid
    });

  } catch (error) {
    console.error('[signer-status] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error during status check',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 