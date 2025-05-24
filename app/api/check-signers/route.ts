import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSignerInfo } from '@/lib/neynar';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');
    
    if (fid) {
      // Check specific FID
      const { data: userData, error } = await supabase
        .from('users')
        .select('fid, signer_uuid, signer_status, signer_approval_url')
        .eq('fid', parseInt(fid))
        .single();
      
      if (error) {
        return NextResponse.json({ 
          error: `No user found for FID ${fid}`,
          details: error
        }, { status: 404 });
      }
      
      // Check the signer status with Neynar API
      let neynarStatus = 'unknown';
      let neynarError = null;
      
      if (userData.signer_uuid) {
        try {
          const signerInfo = await getSignerInfo(userData.signer_uuid);
          neynarStatus = signerInfo.status || 'unknown';
        } catch (err) {
          neynarError = (err as Error).message;
        }
      }
      
      return NextResponse.json({
        success: true,
        fid: userData.fid,
        dbSigner: userData.signer_uuid,
        dbStatus: userData.signer_status,
        neynarStatus: neynarStatus,
        neynarError: neynarError,
        approvalUrl: userData.signer_approval_url
      });
    }
    
    // Get all users with signers
    const { data: users, error } = await supabase
      .from('users')
      .select('fid, signer_uuid, signer_status, signer_approval_url')
      .not('signer_uuid', 'is', null)
      .order('fid');
    
    if (error) {
      throw error;
    }
    
    const results = [];
    
    for (const user of users || []) {
      let neynarStatus = 'unknown';
      let neynarError = null;
      
      if (user.signer_uuid) {
        try {
          const signerInfo = await getSignerInfo(user.signer_uuid);
          neynarStatus = signerInfo.status || 'unknown';
        } catch (err) {
          neynarError = (err as Error).message;
        }
      }
      
      results.push({
        fid: user.fid,
        dbSigner: user.signer_uuid,
        dbStatus: user.signer_status,
        neynarStatus: neynarStatus,
        neynarError: neynarError,
        approvalUrl: user.signer_approval_url
      });
    }
    
    return NextResponse.json({
      success: true,
      message: `Found ${results.length} users with signers`,
      results: results
    });
  } catch (error) {
    console.error('[check-signers] Error:', error);
    return NextResponse.json({ 
      error: (error as Error).message,
      details: error
    }, { status: 500 });
  }
} 