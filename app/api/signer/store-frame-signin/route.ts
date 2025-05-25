import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { fid, siwf_message, siwf_signature } = await request.json();
    
    console.log('[store-frame-signin] Request received:', { fid, hasMessage: !!siwf_message, hasSignature: !!siwf_signature });
    
    if (!fid || !siwf_message || !siwf_signature) {
      console.error('[store-frame-signin] Missing required fields');
      return NextResponse.json({ 
        error: 'Missing required fields: fid, siwf_message, siwf_signature' 
      }, { status: 400 });
    }

    // Create Supabase client inside function to avoid build-time errors
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Parse the SIWF message to get expiration time if available
    let expires_at = null;
    try {
      // SIWF message format includes expiration time - extract it if present
      // This is a simplified extraction - you might want to use a proper SIWF parser
      const messageLines = siwf_message.split('\n');
      const expirationLine = messageLines.find((line: string) => line.startsWith('Expiration Time:'));
      if (expirationLine) {
        const expirationTime = expirationLine.split('Expiration Time: ')[1];
        expires_at = new Date(expirationTime).toISOString();
      } else {
        // Default to 24 hours from now if no expiration specified
        expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      }
    } catch (error) {
      console.warn('[store-frame-signin] Could not parse expiration from SIWF message, using default');
      expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }

    console.log('[store-frame-signin] Storing signer for FID:', fid);

    // Upsert the signer credentials (insert or update if exists)
    const { data, error } = await supabase
      .from('user_signers')
      .upsert({
        fid: fid,
        siwf_message: siwf_message,
        siwf_signature: siwf_signature,
        expires_at: expires_at,
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'fid'
      })
      .select();

    if (error) {
      console.error('[store-frame-signin] Database error:', error);
      return NextResponse.json({ 
        error: `Database error: ${error.message}` 
      }, { status: 500 });
    }

    console.log('[store-frame-signin] Signer stored successfully:', data);

    return NextResponse.json({
      success: true,
      signer: data[0],
      message: 'Frame SDK signIn credentials stored successfully'
    });

  } catch (error) {
    console.error('[store-frame-signin] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
} 