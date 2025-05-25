import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { fid } = await request.json();
    
    if (!fid) {
      console.error('[create-approval] Missing FID');
      return NextResponse.json({ 
        error: 'Missing FID' 
      }, { status: 400 });
    }

    const apiKey = process.env.NEYNAR_API_KEY;
    
    if (!apiKey) {
      console.error('[create-approval] Missing NEYNAR_API_KEY');
      return NextResponse.json({ 
        error: 'Server configuration error' 
      }, { status: 500 });
    }

    console.log('[create-approval] Creating managed signer for FID:', fid);

    // Step 1: Create a managed signer
    const createResponse = await fetch('https://api.neynar.com/v2/farcaster/signer', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'x-api-key': apiKey
      }
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('[create-approval] Failed to create signer:', createResponse.status, errorText);
      return NextResponse.json({ 
        error: 'Failed to create signer',
        details: errorText 
      }, { status: createResponse.status });
    }

    const signerData = await createResponse.json();
    console.log('[create-approval] Signer created:', signerData);

    // Step 2: Register the signed key to get approval URL  
    const registerResponse = await fetch('https://api.neynar.com/v2/farcaster/signer/developer_managed/signed_key', {
      method: 'POST', 
      headers: {
        'accept': 'application/json',
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        signer_uuid: signerData.signer_uuid,
        app_fid: 466111, // Our app's FID from farcaster.json
        deadline: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours from now
      })
    });

    if (!registerResponse.ok) {
      const errorText = await registerResponse.text();
      console.error('[create-approval] Failed to register signed key:', registerResponse.status, errorText);
      return NextResponse.json({ 
        error: 'Failed to register signed key',
        details: errorText 
      }, { status: registerResponse.status });
    }

    const registrationData = await registerResponse.json();
    console.log('[create-approval] Signed key registered:', registrationData);

    return NextResponse.json({
      signer_uuid: signerData.signer_uuid,
      public_key: signerData.public_key,
      approval_url: registrationData.signer_approval_url,
      status: registrationData.status
    });

  } catch (error) {
    console.error('[create-approval] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Failed to create signer approval',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 