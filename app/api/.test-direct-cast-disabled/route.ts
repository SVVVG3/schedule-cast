import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { postCastDirect, validateAndRefreshSigner } from '@/lib/neynar';

/**
 * Test endpoint for direct cast posting, bypassing scheduling
 * 
 * This endpoint is intended for troubleshooting the scheduled cast issues
 * and will help determine if the issue is with the scheduling system or
 * with the casting mechanism itself.
 */
export async function POST(request: Request) {
  try {
    console.log('[test-direct-cast] Processing request');
    
    // Parse request body
    const { cast_id, fid, content, channel_id } = await request.json();
    
    if (cast_id) {
      console.log('[test-direct-cast] Attempting to post scheduled cast directly:', cast_id);
      return await postScheduledCastDirectly(cast_id);
    } else if (fid && content) {
      console.log('[test-direct-cast] Posting new cast directly for FID:', fid);
      return await postNewCastDirectly(fid, content, channel_id);
    } else {
      return NextResponse.json(
        { error: 'Either cast_id or both fid and content are required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[test-direct-cast] Unexpected error:', error);
    return NextResponse.json(
      { error: `An unexpected error occurred: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

/**
 * Post a new cast directly without scheduling
 */
async function postNewCastDirectly(fid: number, content: string, channelId?: string) {
  try {
    // Get the user and their signer UUID from Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, signer_uuid, delegated')
      .eq('fid', fid)
      .maybeSingle();
    
    console.log('[test-direct-cast] User lookup result:', { user, error: userError });
    
    if (userError) {
      throw new Error(`Failed to fetch user: ${userError.message}`);
    }
    
    if (!user) {
      return NextResponse.json(
        { error: `No user found with FID: ${fid}` },
        { status: 404 }
      );
    }
    
    if (!user.signer_uuid) {
      return NextResponse.json(
        { 
          error: 'No signer found for this user.',
          action_required: 'connect_with_siwn'
        },
        { status: 400 }
      );
    }
    
    // Validate and possibly refresh the signer
    const { signerUuid, refreshed } = await validateAndRefreshSigner(user.signer_uuid, fid);
    console.log('[test-direct-cast] Signer validation result:', { signerUuid, refreshed });
    
    if (refreshed) {
      console.log('[test-direct-cast] Signer was refreshed, using new signer:', signerUuid);
    }
    
    // Post the cast directly
    const castResult = await postCastDirect(signerUuid, content, channelId);
    
    console.log('[test-direct-cast] Cast posted successfully:', castResult);
    
    return NextResponse.json({
      success: true,
      message: 'Cast posted successfully',
      signer_refreshed: refreshed,
      cast: castResult
    });
  } catch (error) {
    console.error('[test-direct-cast] Error posting cast:', error);
    return NextResponse.json(
      { error: `Error posting cast: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

/**
 * Post a scheduled cast directly by its ID
 */
async function postScheduledCastDirectly(castId: string) {
  try {
    // Fetch the scheduled cast
    const { data: cast, error: castError } = await supabase
      .from('scheduled_casts')
      .select('id, content, channel_id, fid, signer_uuid, posted, error')
      .eq('id', castId)
      .maybeSingle();
    
    console.log('[test-direct-cast] Scheduled cast lookup:', { cast, error: castError });
    
    if (castError) {
      throw new Error(`Failed to fetch scheduled cast: ${castError.message}`);
    }
    
    if (!cast) {
      return NextResponse.json(
        { error: `No scheduled cast found with ID: ${castId}` },
        { status: 404 }
      );
    }
    
    if (cast.posted) {
      return NextResponse.json(
        { error: `Cast ${castId} has already been posted`, already_posted: true },
        { status: 400 }
      );
    }
    
    // Find the user to get the current signer_uuid
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, signer_uuid')
      .eq('fid', cast.fid)
      .maybeSingle();
    
    if (userError) {
      throw new Error(`Failed to fetch user: ${userError.message}`);
    }
    
    if (!user || !user.signer_uuid) {
      return NextResponse.json(
        { error: `No user or signer found for FID: ${cast.fid}` },
        { status: 404 }
      );
    }
    
    // Validate and possibly refresh the signer
    const { signerUuid, refreshed } = await validateAndRefreshSigner(user.signer_uuid, cast.fid);
    console.log('[test-direct-cast] Signer validation result:', { signerUuid, refreshed });
    
    // Post the cast using the validated signer
    try {
      const castResult = await postCastDirect(signerUuid, cast.content, cast.channel_id);
      
      // Mark as posted in the database
      const { error: updateError } = await supabase
        .from('scheduled_casts')
        .update({
          posted: true,
          posted_at: new Date().toISOString(),
          result: JSON.stringify(castResult),
          error: null
        })
        .eq('id', cast.id);
      
      if (updateError) {
        console.error('[test-direct-cast] Error updating cast status:', updateError);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Scheduled cast posted successfully',
        signer_refreshed: refreshed,
        cast: castResult
      });
    } catch (error) {
      // Mark as error in the database but return detailed error for debugging
      const errorMessage = (error as Error).message || 'Unknown error';
      
      await supabase
        .from('scheduled_casts')
        .update({
          error: errorMessage
        })
        .eq('id', cast.id);
      
      throw error; // Re-throw to be caught by outer catch block
    }
  } catch (error) {
    console.error('[test-direct-cast] Error posting scheduled cast:', error);
    return NextResponse.json(
      { error: `Error posting scheduled cast: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 