import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { fid } = await request.json();
    
    if (!fid) {
      console.error('[create-managed] Missing required field: fid');
      return NextResponse.json({ 
        error: 'Missing required field: fid' 
      }, { status: 400 });
    }

    const apiKey = process.env.NEYNAR_API_KEY;
    
    if (!apiKey) {
      console.error('[create-managed] Missing NEYNAR_API_KEY');
      return NextResponse.json({ 
        error: 'Server configuration error' 
      }, { status: 500 });
    }

    console.log('[create-managed] Creating managed signer for FID:', fid);

    // Create a managed signer using Neynar's API
    // This doesn't require developer mnemonics - Neynar handles the signer creation
    const response = await fetch('https://api.neynar.com/v2/farcaster/signer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_key': apiKey,
      },
      // Note: No body needed for managed signers - Neynar creates them automatically
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[create-managed] Failed to create managed signer:', errorText);
      return NextResponse.json({ 
        error: 'Failed to create managed signer',
        details: errorText
      }, { status: response.status });
    }

    const signerData = await response.json();
    console.log('[create-managed] Managed signer created:', signerData.signer_uuid);

    return NextResponse.json({
      success: true,
      signer_uuid: signerData.signer_uuid,
      signer_approval_url: signerData.signer_approval_url,
      status: signerData.status,
      message: 'Managed signer created successfully. User must approve in Warpcast.'
    });

  } catch (error) {
    console.error('[create-managed] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error during managed signer creation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 