import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * API endpoint to mark a user as needing signer approval
 * This can be called when scheduled casts fail due to unapproved signers
 */
export async function POST(request: Request) {
  try {
    const { fid, signer_uuid, approval_url } = await request.json();
    
    if (!fid) {
      return NextResponse.json(
        { error: 'Missing fid parameter' },
        { status: 400 }
      );
    }
    
    console.log(`[signer/mark-needs-approval] Marking FID ${fid} as needing signer approval`);
    
    // Update the user record to indicate they need approval
    const { error } = await supabase
      .from('users')
      .update({
        needs_signer_approval: true,
        signer_status: 'generated',
        signer_approval_url: approval_url || null,
        signer_uuid: signer_uuid || undefined, // Only update if provided
        last_signer_check: new Date().toISOString()
      })
      .eq('fid', fid);
    
    if (error) {
      console.error(`[signer/mark-needs-approval] Error updating user:`, error);
      return NextResponse.json(
        { error: `Error updating user: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'User marked as needing signer approval',
      approval_url: approval_url || null
    });
  } catch (error) {
    console.error(`[signer/mark-needs-approval] Unexpected error:`, error);
    return NextResponse.json(
      { error: `An unexpected error occurred: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 