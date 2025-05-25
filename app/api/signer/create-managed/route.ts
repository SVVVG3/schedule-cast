import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';

// Create Neynar client with proper configuration
const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY!,
});
const neynarClient = new NeynarAPIClient(config);

export async function POST(request: NextRequest) {
  try {
    const { fid } = await request.json();
    
    console.log('[create-managed] Creating managed signer for FID:', fid);
    
    if (!fid) {
      return NextResponse.json({ 
        error: 'FID is required' 
      }, { status: 400 });
    }

    // Check if user already has an approved managed signer
    const { data: existingSigner, error: checkError } = await supabase
      .from('managed_signers')
      .select('*')
      .eq('fid', fid)
      .eq('status', 'approved')
      .single();

    if (existingSigner && !checkError) {
      console.log('[create-managed] User already has approved signer:', existingSigner.signer_uuid);
      return NextResponse.json({
        success: true,
        signer_uuid: existingSigner.signer_uuid,
        status: 'approved',
        message: 'User already has approved posting permissions'
      });
    }

    // Create a new managed signer through Neynar
    console.log('[create-managed] Creating new managed signer via Neynar API...');
    
    const signer = await neynarClient.createSigner();
    console.log('[create-managed] Created signer:', signer.signer_uuid);

    // Store the managed signer in our database
    const { data: dbSigner, error: dbError } = await supabase
      .from('managed_signers')
      .insert({
        fid: fid,
        signer_uuid: signer.signer_uuid,
        public_key: signer.public_key || null,
        signer_approval_url: signer.signer_approval_url || null,
        status: 'pending'
      })
      .select()
      .single();

    if (dbError) {
      console.error('[create-managed] Database error:', dbError);
      return NextResponse.json({ 
        error: `Database error: ${dbError.message}` 
      }, { status: 500 });
    }

    console.log('[create-managed] Managed signer stored in database');

    return NextResponse.json({
      success: true,
      signer_uuid: signer.signer_uuid,
      public_key: signer.public_key,
      signer_approval_url: signer.signer_approval_url,
      status: 'pending',
      message: 'Managed signer created successfully. User needs to approve posting permissions.'
    });

  } catch (error) {
    console.error('[create-managed] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}

// Also allow GET for checking managed signer status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fid = searchParams.get('fid');
    
    if (!fid) {
      return NextResponse.json({ 
        error: 'FID parameter is required' 
      }, { status: 400 });
    }

    // Get user's managed signers
    const { data: signers, error } = await supabase
      .from('managed_signers')
      .select('*')
      .eq('fid', fid)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[create-managed] Database error:', error);
      return NextResponse.json({ 
        error: `Database error: ${error.message}` 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      signers: signers || []
    });

  } catch (error) {
    console.error('[create-managed] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
} 