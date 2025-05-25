import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { user_fid, cast_content, scheduled_time } = await request.json();
    
    console.log('[create-scheduled-cast] Request received:', { 
      user_fid, 
      cast_content: cast_content?.substring(0, 50) + '...', 
      scheduled_time 
    });
    
    if (!user_fid || !cast_content || !scheduled_time) {
      console.error('[create-scheduled-cast] Missing required fields');
      return NextResponse.json({ 
        error: 'Missing required fields: user_fid, cast_content, scheduled_time' 
      }, { status: 400 });
    }

    // Validate scheduled time is in the future
    const scheduledDate = new Date(scheduled_time);
    const now = new Date();
    
    if (scheduledDate <= now) {
      return NextResponse.json({ 
        error: 'Scheduled time must be in the future' 
      }, { status: 400 });
    }

    // Check if user has valid signer credentials
    const { data: signer, error: signerError } = await supabase
      .from('user_signers')
      .select('*')
      .eq('fid', user_fid)
      .eq('is_active', true)
      .single();

    if (signerError || !signer) {
      console.error('[create-scheduled-cast] No valid signer found for FID:', user_fid);
      return NextResponse.json({ 
        error: 'No valid posting permissions found. Please grant posting permissions first.' 
      }, { status: 403 });
    }

    // Check if signer credentials have expired
    if (signer.expires_at && new Date(signer.expires_at) <= now) {
      console.error('[create-scheduled-cast] Signer credentials expired for FID:', user_fid);
      return NextResponse.json({ 
        error: 'Posting permissions have expired. Please grant posting permissions again.' 
      }, { status: 403 });
    }

    console.log('[create-scheduled-cast] Creating scheduled cast for FID:', user_fid);

    // Insert the scheduled cast
    const { data: scheduledCast, error } = await supabase
      .from('scheduled_casts')
      .insert({
        user_fid: user_fid,
        cast_content: cast_content,
        scheduled_time: scheduledDate.toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('[create-scheduled-cast] Database error:', error);
      return NextResponse.json({ 
        error: `Database error: ${error.message}` 
      }, { status: 500 });
    }

    console.log('[create-scheduled-cast] Scheduled cast created successfully:', scheduledCast.id);

    return NextResponse.json({
      success: true,
      scheduled_cast: scheduledCast,
      message: 'Cast scheduled successfully'
    });

  } catch (error) {
    console.error('[create-scheduled-cast] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const user_fid = url.searchParams.get('user_fid');
    
    if (!user_fid) {
      return NextResponse.json({ 
        error: 'Missing user_fid parameter' 
      }, { status: 400 });
    }

    console.log('[get-scheduled-casts] Fetching scheduled casts for FID:', user_fid);

    // Get user's scheduled casts
    const { data: scheduledCasts, error } = await supabase
      .from('scheduled_casts')
      .select('*')
      .eq('user_fid', parseInt(user_fid))
      .order('scheduled_time', { ascending: true });

    if (error) {
      console.error('[get-scheduled-casts] Database error:', error);
      return NextResponse.json({ 
        error: `Database error: ${error.message}` 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      scheduled_casts: scheduledCasts
    });

  } catch (error) {
    console.error('[get-scheduled-casts] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
} 