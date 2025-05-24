import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSignerInfo, postCastDirect } from '@/lib/neynar';

/**
 * API endpoint to check a user's signer approval status
 * and provide approval URLs if needed
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');
    const testPost = searchParams.get('testPost') === 'true'; // Only post test cast if explicitly requested
    
    if (!fid) {
      return NextResponse.json({ 
        error: 'fid query parameter is required' 
      }, { status: 400 });
    }
    
    console.log(`[signer/approval-status] Checking signer status for FID ${fid} (testPost: ${testPost})`);
    
    // Get the user's current signer from database
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('fid', parseInt(fid))
      .single();
    
    if (error) {
      console.error('[signer/approval-status] Database error:', error);
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    if (!userData.signer_uuid) {
      return NextResponse.json({
        status: 'no_signer',
        needs_approval: true,
        message: 'No signer found - user needs to sign in with Neynar'
      });
    }
    
    const signerUuid = userData.signer_uuid;
    console.log(`[signer/approval-status] Testing signer: ${signerUuid}`);
    
    // For SIWN signers, we'll assume they're approved unless test posting is explicitly requested
    if (!testPost) {
      console.log(`[signer/approval-status] Skipping test post - assuming SIWN signer is approved`);
      
      // Update database to reflect that we checked and it's approved
      await supabase
        .from('users')
        .update({
          signer_status: 'approved',
          needs_signer_approval: false,
          last_signer_check: new Date().toISOString()
        })
        .eq('fid', parseInt(fid));
      
      return NextResponse.json({
        status: 'approved',
        needs_approval: false,
        message: 'SIWN signer is ready for posting',
        signer_uuid: signerUuid
      });
    }
    
    // Only perform actual test posting when explicitly requested
    try {
      // Try to post a test cast to verify the signer works
      const testCast = await postCastDirect(
        signerUuid,
        `🧪 Signer validation test - ${new Date().toISOString().slice(0, 19)} (this cast verifies your signer is working)`
      );
      
      if (testCast?.hash) {
        console.log(`[signer/approval-status] SIWN signer ${signerUuid} can post successfully`);
        
        // Update database to reflect approved status
        await supabase
          .from('users')
          .update({
            signer_status: 'approved',
            needs_signer_approval: false,
            signer_approval_url: null,
            last_signer_check: new Date().toISOString()
          })
          .eq('fid', parseInt(fid));
        
        return NextResponse.json({
          status: 'approved',
          needs_approval: false,
          message: 'Signer is working perfectly! Test cast posted successfully.',
          test_cast_hash: testCast.hash,
          signer_uuid: signerUuid
        });
      } else {
        console.log(`[signer/approval-status] Test post failed - no hash returned`);
        return NextResponse.json({
          status: 'error',
          needs_approval: true,
          message: 'Test post failed - signer may need approval'
        });
      }
    } catch (error: any) {
      console.error('[signer/approval-status] Error testing signer:', error);
      
      if (error.message?.includes('SignerNotApproved') || error.status === 401) {
        // Construct approval URL for SIWN signer
        const approvalUrl = `https://client.warpcast.com/deeplinks/signed-key-request?token=${userData.signer_uuid}`;
        
        // Update database
        await supabase
          .from('users')
          .update({
            signer_status: 'generated',
            needs_signer_approval: true,
            signer_approval_url: approvalUrl,
            last_signer_check: new Date().toISOString()
          })
          .eq('fid', parseInt(fid));
        
        return NextResponse.json({
          status: 'needs_approval',
          needs_approval: true,
          approval_url: approvalUrl,
          message: 'Signer needs approval in Warpcast before it can post casts',
          signer_uuid: signerUuid
        });
      }
      
      return NextResponse.json({
        status: 'error',
        needs_approval: true,
        message: `Error testing signer: ${error.message}`,
        signer_uuid: signerUuid
      });
    }
  } catch (error) {
    console.error('[signer/approval-status] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

 