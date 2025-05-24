import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSignerInfo, createSignerDirect } from '@/lib/neynar';

/**
 * API endpoint to check a user's signer approval status
 * and provide approval URLs if needed
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const fid = url.searchParams.get('fid');
    
    if (!fid) {
      return NextResponse.json(
        { error: 'Missing fid parameter' },
        { status: 400 }
      );
    }
    
    console.log(`[signer/approval-status] Checking signer status for FID ${fid}`);
    
    // Get the user record
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('signer_uuid, signer_status, signer_approval_url, needs_signer_approval')
      .eq('fid', parseInt(fid))
      .maybeSingle();
    
    if (userError) {
      console.error(`[signer/approval-status] Error fetching user:`, userError);
      return NextResponse.json(
        { error: `Error fetching user: ${userError.message}` },
        { status: 500 }
      );
    }
    
    if (!user) {
      return NextResponse.json(
        { error: `No user found with FID: ${fid}` },
        { status: 404 }
      );
    }
    
    // If the user doesn't have a signer, this shouldn't happen with SIWN
    if (!user.signer_uuid) {
      return NextResponse.json({
        error: 'User has no signer - this should not happen with SIWN authentication',
        needs_approval: true,
        status: 'missing'
      }, { status: 400 });
    }
    
    // Check the current SIWN signer's status
    try {
      const signerInfo = await getSignerInfo(user.signer_uuid);
      
      // If the signer is approved, update the user record
      if (signerInfo.status === 'approved') {
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
          message: 'Signer is approved and ready to use',
          needs_approval: false
        });
      } else {
        // SIWN signer exists but isn't approved - guide user to approve it
        return NextResponse.json({
          status: signerInfo.status || 'generated',
          message: `Your SIWN signer needs approval in Warpcast (status: ${signerInfo.status})`,
          needs_approval: true,
          approval_url: user.signer_approval_url || null,
          signer_uuid: user.signer_uuid
        });
      }
    } catch (error) {
      console.error(`[signer/approval-status] Error checking SIWN signer:`, error);
      
      // If SIWN signer is not found, it probably needs approval
      // Don't create a new signer - guide user to approve the SIWN one
      return NextResponse.json({
        status: 'generated',
        message: 'Your SIWN signer needs approval in Warpcast',
        needs_approval: true,
        approval_url: user.signer_approval_url || null,
        signer_uuid: user.signer_uuid,
        error: `SIWN signer not found in Neynar - likely needs approval`
      });
    }
  } catch (error) {
    console.error(`[signer/approval-status] Unexpected error:`, error);
    return NextResponse.json(
      { error: `An unexpected error occurred: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

/**
 * Helper function to create a new signer for a user
 */
async function createNewSigner(fid: number) {
  try {
    // Create a new signer
    const signerData = await createSignerDirect();
    
    // Update the user record
    await supabase
      .from('users')
      .update({
        signer_uuid: signerData.signer_uuid,
        signer_status: signerData.status || 'generated',
        signer_approval_url: signerData.signer_approval_url || null,
        needs_signer_approval: signerData.status !== 'approved',
        last_signer_check: new Date().toISOString()
      })
      .eq('fid', fid);
      
    if (signerData.status === 'approved') {
      return NextResponse.json({
        status: 'approved',
        message: 'New signer created and approved',
        needs_approval: false
      });
    } else {
      return NextResponse.json({
        status: signerData.status || 'generated',
        message: 'New signer created, needs approval',
        needs_approval: true,
        approval_url: signerData.signer_approval_url || null
      });
    }
  } catch (error) {
    console.error(`[signer/approval-status] Error creating new signer:`, error);
    return NextResponse.json(
      { error: `Failed to create new signer: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 