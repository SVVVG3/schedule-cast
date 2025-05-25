import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client inside function to avoid build-time errors
function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const { user_fid, cast_content, scheduled_time } = await request.json();
    
    console.log('[create-scheduled-cast] Request received:', { 
      user_fid, 
      cast_content: cast_content?.substring(0, 50) + '...', 
      scheduled_time 
    });
    
    if (!user_fid || !cast_content || !scheduled_time) {
      return NextResponse.json({ 
        error: 'Missing required fields: user_fid, cast_content, scheduled_time' 
      }, { status: 400 });
    }

    const supabase = createSupabaseClient();

    // Validate the scheduled time is in the future
    const scheduledDate = new Date(scheduled_time);
    const now = new Date();
    
    if (scheduledDate <= now) {
      return NextResponse.json({ 
        error: 'Scheduled time must be in the future' 
      }, { status: 400 });
    }

    // Check if user has valid authentication (SIWF credentials)
    const { data: userSigner, error: signerError } = await supabase
      .from('user_signers')
      .select('fid, is_active, expires_at')
      .eq('fid', user_fid)
      .eq('is_active', true)
      .single();

    if (signerError || !userSigner) {
      console.error('[create-scheduled-cast] User authentication not found:', signerError);
      return NextResponse.json({ 
        error: 'User authentication required. Please sign in first.' 
      }, { status: 401 });
    }

    // Check if authentication has expired
    if (userSigner.expires_at && new Date(userSigner.expires_at) <= now) {
      return NextResponse.json({ 
        error: 'Authentication has expired. Please sign in again.' 
      }, { status: 401 });
    }

    // Check if user has approved managed signer for posting
    const { data: managedSigner, error: managedSignerError } = await supabase
      .from('managed_signers')
      .select('signer_uuid, status, approved_at')
      .eq('fid', user_fid)
      .eq('status', 'approved')
      .order('approved_at', { ascending: false })
      .limit(1)
      .single();

    if (managedSignerError || !managedSigner) {
      console.error('[create-scheduled-cast] No approved managed signer found:', managedSignerError);
      return NextResponse.json({ 
        error: 'Posting permissions required. Please grant posting permissions first.' 
      }, { status: 403 });
    }

    // Create the scheduled cast
    const { data: scheduledCast, error: createError } = await supabase
      .from('scheduled_casts')
      .insert({
        user_fid: user_fid,
        cast_content: cast_content,
        scheduled_time: scheduled_time,
        managed_signer_uuid: managedSigner.signer_uuid,
        status: 'pending'
      })
      .select()
      .single();

    if (createError) {
      console.error('[create-scheduled-cast] Database error:', createError);
      return NextResponse.json({ 
        error: `Database error: ${createError.message}` 
      }, { status: 500 });
    }

    console.log('[create-scheduled-cast] Scheduled cast created successfully:', scheduledCast.id);

    return NextResponse.json({
      success: true,
      scheduled_cast: {
        id: scheduledCast.id,
        cast_content: scheduledCast.cast_content,
        scheduled_time: scheduledCast.scheduled_time,
        status: scheduledCast.status,
        created_at: scheduledCast.created_at
      },
      message: 'Cast scheduled successfully'
    });

  } catch (error) {
    console.error('[create-scheduled-cast] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}

// Also allow GET for testing user's scheduled casts
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const user_fid = searchParams.get('user_fid');
    
    if (!user_fid) {
      return NextResponse.json({ 
        error: 'user_fid parameter is required' 
      }, { status: 400 });
    }

    const supabase = createSupabaseClient();

    // Get user's scheduled casts
    const { data: scheduledCasts, error } = await supabase
      .from('scheduled_casts')
      .select(`
        id,
        cast_content,
        scheduled_time,
        status,
        cast_hash,
        error_message,
        created_at,
        managed_signer_uuid
      `)
      .eq('user_fid', user_fid)
      .order('scheduled_time', { ascending: true });

    if (error) {
      console.error('[create-scheduled-cast] Database error:', error);
      return NextResponse.json({ 
        error: `Database error: ${error.message}` 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      scheduled_casts: scheduledCasts || []
    });

  } catch (error) {
    console.error('[create-scheduled-cast] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
} 