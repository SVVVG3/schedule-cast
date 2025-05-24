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
    
    if (!fid) {
      return NextResponse.json({ 
        error: 'fid query parameter is required' 
      }, { status: 400 });
    }
    
    console.log(`[signer/approval-status] Checking signer status for FID ${fid}`);
    
    // Get the user's current signer from database
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('fid', parseInt(fid))
      .single();
    
    if (error || !userData) {
      return NextResponse.json({
        needs_approval: true,
        message: 'User not found. Please sign in with Neynar first.',
        signer_uuid: null,
        approval_url: null
      });
    }
    
    const signerUuid = userData.signer_uuid;
    
    if (!signerUuid) {
      return NextResponse.json({
        needs_approval: true,
        message: 'No signer found. Please sign in with Neynar.',
        signer_uuid: null,
        approval_url: null
      });
    }
    
    console.log(`[signer/approval-status] Testing signer: ${signerUuid}`);
    
    // For SIWN signers, test actual posting capability instead of relying on signer info API
    // This is because SIWN signers may not appear in the signer info API but can still post
    try {
      // Try to post a test cast to verify the signer works
      const testCast = await postCastDirect(
        signerUuid,
        `🧪 Signer approval test - ${new Date().toISOString().slice(0, 19)} (this cast verifies your signer is working)`
      );
      
      if (testCast?.success) {
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
          needs_approval: false,
          message: 'Signer is approved and working! Test cast posted successfully.',
          signer_uuid: signerUuid,
          signer_status: 'approved',
          test_cast_hash: testCast.cast?.hash,
          approval_url: null
        });
      }
    } catch (postError: any) {
      console.log(`[signer/approval-status] SIWN signer ${signerUuid} cannot post:`, postError.message);
      
      // If posting fails, try to get signer info for more details
      try {
        const signerInfo = await getSignerInfo(signerUuid);
        console.log(`[signer/approval-status] Signer info:`, signerInfo);
        
        if (signerInfo.status === 'approved') {
          return NextResponse.json({
            needs_approval: false,
            message: 'Signer is approved according to Neynar API',
            signer_uuid: signerUuid,
            signer_status: signerInfo.status,
            approval_url: null
          });
        } else {
          // Signer exists but not approved
          const approvalUrl = `https://client.warpcast.com/deeplinks/signed-key-request?token=${signerInfo.public_key}`;
          
          return NextResponse.json({
            needs_approval: true,
            message: `Signer status is "${signerInfo.status}". Please approve it in Warpcast.`,
            signer_uuid: signerUuid,
            signer_status: signerInfo.status,
            approval_url: approvalUrl
          });
        }
      } catch (signerInfoError: any) {
        console.log(`[signer/approval-status] Error checking SIWN signer:`, signerInfoError.message);
        
        // For SIWN signers, if both posting and signer info fail, 
        // it might be a timing issue. Guide user to approve if needed.
        if (postError.message?.includes('SignerNotApproved') || postError.message?.includes('generated')) {
          // Create a Warpcast approval URL for SIWN signer
          const approvalUrl = userData.signer_approval_url || `https://client.warpcast.com/deeplinks/signed-key-request?token=0x${signerUuid.replace(/-/g, '')}`;
          
          return NextResponse.json({
            needs_approval: true,
            message: 'Your SIWN signer needs manual approval in Warpcast. This sometimes happens even after SIWN sign-in.',
            signer_uuid: signerUuid,
            signer_status: 'generated',
            approval_url: approvalUrl,
            help_text: 'Click the approval URL and approve the signer in Warpcast. Then refresh this page.'
          });
        }
        
        // Unknown error
        return NextResponse.json({
          needs_approval: true,
          message: `Unable to verify signer status: ${postError.message}`,
          signer_uuid: signerUuid,
          approval_url: null,
          error: postError.message
        });
      }
    }
  } catch (error: any) {
    console.error('[signer/approval-status] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

 