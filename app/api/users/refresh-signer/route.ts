import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createSignerDirect } from "@/lib/neynar";

/**
 * API route to force refresh a user's signer
 * 
 * This endpoint can be called manually to refresh a user's signer when it's expired
 * /api/users/refresh-signer?fid=123456
 */
export async function GET(request: NextRequest) {
  try {
    // Get FID from query param
    const fid = request.nextUrl.searchParams.get('fid');
    
    if (!fid || isNaN(Number(fid))) {
      return NextResponse.json({ error: 'Valid FID parameter is required' }, { status: 400 });
    }
    
    const numericFid = Number(fid);
    console.log(`[refresh-signer] Refreshing signer for FID: ${numericFid}`);
    
    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('fid', numericFid)
      .maybeSingle();
    
    if (userError) {
      console.error(`[refresh-signer] Error finding user:`, userError);
      return NextResponse.json({ error: 'Error finding user' }, { status: 500 });
    }
    
    if (!user) {
      console.log(`[refresh-signer] No user found with FID: ${numericFid}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log(`[refresh-signer] Found user:`, user);
    
    // Create new signer
    try {
      // Use the direct API method instead of the SDK
      const newSignerData = await createSignerDirect();
      const newSignerUuid = newSignerData.signer_uuid;
      
      console.log(`[refresh-signer] Created new signer: ${newSignerUuid}`);
      
      // Update user record
      const { error: updateError } = await supabase
        .from('users')
        .update({ signer_uuid: newSignerUuid })
        .eq('fid', numericFid);
      
      if (updateError) {
        console.error(`[refresh-signer] Error updating user:`, updateError);
        return NextResponse.json({ 
          error: 'Failed to update user record', 
          details: updateError.message 
        }, { status: 500 });
      }
      
      // Update any scheduled casts that haven't been posted yet
      const { error: castsError } = await supabase
        .from('scheduled_casts')
        .update({ signer_uuid: newSignerUuid })
        .eq('fid', numericFid)
        .eq('posted', false);
      
      if (castsError) {
        console.error(`[refresh-signer] Error updating scheduled casts:`, castsError);
        // Don't fail the operation if this part fails
      }
      
      return NextResponse.json({
        success: true,
        message: `Successfully refreshed signer for FID: ${numericFid}`,
        old_signer: user.signer_uuid,
        new_signer: newSignerUuid
      });
    } catch (signerError) {
      console.error(`[refresh-signer] Error creating new signer:`, signerError);
      return NextResponse.json({ 
        error: 'Failed to create new signer', 
        details: signerError instanceof Error ? signerError.message : String(signerError)
      }, { status: 500 });
    }
  } catch (error) {
    console.error(`[refresh-signer] Unexpected error:`, error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 