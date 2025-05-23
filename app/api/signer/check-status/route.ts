import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkSignerStatus } from '@/lib/neynar';

/**
 * Check the approval status of a user's signer and update the database
 */
export async function POST(request: Request) {
  try {
    const { fid } = await request.json();
    
    if (!fid) {
      return NextResponse.json(
        { error: 'Missing fid parameter' },
        { status: 400 }
      );
    }
    
    console.log(`[check-status] Checking signer status for FID ${fid}`);
    
    // Get the user's current signer info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('signer_uuid, signer_status, signer_approval_url')
      .eq('fid', fid)
      .maybeSingle();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    if (!user.signer_uuid) {
      return NextResponse.json(
        { error: 'No signer found for user' },
        { status: 404 }
      );
    }
    
    // Check the current status with Neynar
    try {
      const signerStatus = await checkSignerStatus(user.signer_uuid);
      
      // Update the database with the latest status
      const { error: updateError } = await supabase
        .from('users')
        .update({
          signer_status: signerStatus.status,
          needs_signer_approval: !signerStatus.approved,
          last_signer_check: new Date().toISOString()
        })
        .eq('fid', fid);
      
      if (updateError) {
        console.error('[check-status] Error updating user:', updateError);
        return NextResponse.json(
          { error: 'Failed to update user status' },
          { status: 500 }
        );
      }
      
      console.log(`[check-status] Updated status for FID ${fid}: ${signerStatus.status}`);
      
      return NextResponse.json({
        success: true,
        fid: fid,
        signer_uuid: user.signer_uuid,
        status: signerStatus.status,
        approved: signerStatus.approved,
        needs_approval: !signerStatus.approved,
        approval_url: user.signer_approval_url
      });
      
    } catch (signerError: any) {
      console.error('[check-status] Error checking signer status:', signerError);
      
      // If signer doesn't exist or is invalid, mark it as needing approval
      const { error: updateError } = await supabase
        .from('users')
        .update({
          signer_status: 'invalid',
          needs_signer_approval: true,
          last_signer_check: new Date().toISOString()
        })
        .eq('fid', fid);
      
      return NextResponse.json({
        success: false,
        fid: fid,
        signer_uuid: user.signer_uuid,
        status: 'invalid',
        approved: false,
        needs_approval: true,
        error: signerError.message,
        approval_url: user.signer_approval_url
      });
    }
  } catch (error) {
    console.error('[check-status] Unexpected error:', error);
    return NextResponse.json(
      { error: `Failed to check signer status: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 