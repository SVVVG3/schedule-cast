import { NextRequest, NextResponse } from 'next/server';
import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';
import { supabase } from '@/lib/supabase';

// Create Neynar client
const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY!,
});
const neynarClient = new NeynarAPIClient(config);

export async function POST(request: NextRequest) {
  try {
    const { signer_uuid } = await request.json();
    
    console.log('[check-managed-status] Checking signer status:', signer_uuid);
    
    if (!signer_uuid) {
      return NextResponse.json({ 
        error: 'signer_uuid is required' 
      }, { status: 400 });
    }


    // Get signer from our database
    const { data: dbSigner, error: dbError } = await supabase
      .from('managed_signers')
      .select('*')
      .eq('signer_uuid', signer_uuid)
      .single();

    if (dbError || !dbSigner) {
      console.error('[check-managed-status] Signer not found in database:', dbError);
      return NextResponse.json({ 
        error: 'Signer not found' 
      }, { status: 404 });
    }

    // Check signer status with Neynar
    try {
      console.log('[check-managed-status] Checking signer status with Neynar...');
      
      const signerInfo = await neynarClient.lookupSigner(signer_uuid);
      console.log('[check-managed-status] Neynar signer info:', signerInfo);

      let newStatus = dbSigner.status;
      let approvedAt = dbSigner.approved_at;

      // Map Neynar status to our status
      if (signerInfo.status === 'approved') {
        newStatus = 'approved';
        approvedAt = approvedAt || new Date().toISOString();
      } else if (signerInfo.status === 'revoked') {
        newStatus = 'revoked';
      } else {
        newStatus = 'pending';
      }

      // Update database if status changed
      if (newStatus !== dbSigner.status) {
        console.log('[check-managed-status] Updating signer status:', newStatus);
        
        const { error: updateError } = await supabase
          .from('managed_signers')
          .update({
            status: newStatus,
            approved_at: approvedAt
          })
          .eq('signer_uuid', signer_uuid);

        if (updateError) {
          console.error('[check-managed-status] Error updating status:', updateError);
        }
      }

      return NextResponse.json({
        success: true,
        signer_uuid,
        status: newStatus,
        approved_at: approvedAt,
        fid: dbSigner.fid
      });

    } catch (neynarError) {
      console.error('[check-managed-status] Neynar API error:', neynarError);
      
      // Return current database status if Neynar API fails
      return NextResponse.json({
        success: true,
        signer_uuid,
        status: dbSigner.status,
        approved_at: dbSigner.approved_at,
        fid: dbSigner.fid,
        warning: 'Could not verify with Neynar API'
      });
    }

  } catch (error) {
    console.error('[check-managed-status] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}

// Also allow GET for checking by FID
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fid = searchParams.get('fid');
    
    if (!fid) {
      return NextResponse.json({ 
        error: 'FID parameter is required' 
      }, { status: 400 });
    }


    // Get user's approved managed signer
    const { data: signer, error } = await supabase
      .from('managed_signers')
      .select('*')
      .eq('fid', fid)
      .eq('status', 'approved')
      .order('approved_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !signer) {
      return NextResponse.json({
        success: true,
        has_approved_signer: false,
        fid: parseInt(fid)
      });
    }

    return NextResponse.json({
      success: true,
      has_approved_signer: true,
      signer_uuid: signer.signer_uuid,
      status: signer.status,
      approved_at: signer.approved_at,
      fid: signer.fid
    });

  } catch (error) {
    console.error('[check-managed-status] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
} 