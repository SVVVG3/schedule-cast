import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createSignerDirect } from '@/lib/neynar';

/**
 * Create a new Neynar managed signer for a user
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
    
    console.log(`[create-new] Creating new signer for FID ${fid}`);
    
    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('fid', fid)
      .maybeSingle();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    try {
      // Create a new Neynar managed signer
      const signerData = await createSignerDirect();
      
      console.log(`[create-new] Created signer for FID ${fid}:`, signerData.signer_uuid);
      
      // Update the user record with the new signer
      const { error: updateError } = await supabase
        .from('users')
        .update({
          signer_uuid: signerData.signer_uuid,
          signer_approval_url: signerData.signer_approval_url,
          signer_status: signerData.status,
          needs_signer_approval: !signerData.approved,
          last_signer_check: new Date().toISOString()
        })
        .eq('fid', fid);
      
      if (updateError) {
        console.error('[create-new] Error updating user:', updateError);
        return NextResponse.json(
          { error: 'Failed to update user with new signer' },
          { status: 500 }
        );
      }
      
      // Also update any pending scheduled casts
      try {
        const { error: castsError } = await supabase
          .from('scheduled_casts')
          .update({ signer_uuid: signerData.signer_uuid })
          .eq('fid', fid)
          .eq('posted', false);
        
        if (castsError) {
          console.error('[create-new] Error updating scheduled casts:', castsError);
          // Don't fail the operation for this
        }
      } catch (castsUpdateError) {
        console.error('[create-new] Error updating scheduled casts:', castsUpdateError);
        // Don't fail the operation for this
      }
      
      return NextResponse.json({
        success: true,
        message: 'New signer created successfully',
        fid: fid,
        signer_uuid: signerData.signer_uuid,
        status: signerData.status,
        approved: signerData.approved,
        needs_approval: !signerData.approved,
        approval_url: signerData.signer_approval_url,
        instructions: signerData.approved 
          ? 'Signer is already approved and ready to use!' 
          : 'Please visit the approval URL to authorize Schedule-Cast to post on your behalf'
      });
      
    } catch (signerError: any) {
      console.error('[create-new] Error creating signer:', signerError);
      return NextResponse.json(
        { error: `Failed to create signer: ${signerError.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[create-new] Unexpected error:', error);
    return NextResponse.json(
      { error: `Failed to create new signer: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 