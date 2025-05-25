import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { fid, message, signature, nonce } = await request.json();
    
    if (!fid || !message || !signature || !nonce) {
      console.error('[create-from-siwf] Missing required fields');
      return NextResponse.json({ 
        error: 'Missing required fields: fid, message, signature, nonce' 
      }, { status: 400 });
    }

    const apiKey = process.env.NEYNAR_API_KEY;
    
    if (!apiKey) {
      console.error('[create-from-siwf] Missing NEYNAR_API_KEY');
      return NextResponse.json({ 
        error: 'Server configuration error' 
      }, { status: 500 });
    }

    console.log('[create-from-siwf] Processing SIWF credential for FID:', fid);

    // Step 1: Create Neynar signer using the SIWF credential
    console.log('[create-from-siwf] Creating Neynar signer...');
    
    const createSignerResponse = await fetch('https://api.neynar.com/v2/farcaster/signer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_key': apiKey,
      },
      body: JSON.stringify({
        fid: fid,
        deadline: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
      }),
    });

    if (!createSignerResponse.ok) {
      const errorText = await createSignerResponse.text();
      console.error('[create-from-siwf] Failed to create Neynar signer:', errorText);
      return NextResponse.json({ 
        error: 'Failed to create Neynar signer',
        details: errorText
      }, { status: createSignerResponse.status });
    }

    const signerData = await createSignerResponse.json();
    console.log('[create-from-siwf] Neynar signer created:', signerData.signer_uuid);

    // Step 2: Register the signer with SIWF credential
    console.log('[create-from-siwf] Registering signer with SIWF credential...');
    
    const registerResponse = await fetch('https://api.neynar.com/v2/farcaster/signer/signed_key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_key': apiKey,
      },
      body: JSON.stringify({
        signer_uuid: signerData.signer_uuid,
        app_fid: 466111, // Your app FID from farcaster.json
        deadline: Math.floor(Date.now() / 1000) + 86400,
        signature: signature,
        signed_key_request: {
          token: signerData.signed_key_request.token,
          deeplinkUrl: signerData.signed_key_request.deeplinkUrl,
          key: signerData.signed_key_request.key,
          requestFid: fid,
          state: 'pending'
        }
      }),
    });

    if (!registerResponse.ok) {
      const errorText = await registerResponse.text();
      console.error('[create-from-siwf] Failed to register signer:', errorText);
      return NextResponse.json({ 
        error: 'Failed to register signer with SIWF credential',
        details: errorText
      }, { status: registerResponse.status });
    }

    const registerData = await registerResponse.json();
    console.log('[create-from-siwf] Signer registered successfully');

    return NextResponse.json({
      success: true,
      signer_uuid: signerData.signer_uuid,
      message: 'Signer created and registered successfully'
    });

  } catch (error) {
    console.error('[create-from-siwf] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error during signer creation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 