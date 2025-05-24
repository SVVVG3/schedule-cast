import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('[debug-cron-query] Testing cron job query');
    
    const currentTime = new Date().toISOString();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    console.log('[debug-cron-query] Current time:', currentTime);
    console.log('[debug-cron-query] 24 hours ago:', twentyFourHoursAgo);
    
    // First, let's see ALL scheduled casts
    const { data: allCasts, error: allError } = await supabase
      .from('scheduled_casts')
      .select('*');
    
    if (allError) {
      console.error('[debug-cron-query] Error fetching all casts:', allError);
      return NextResponse.json({ error: allError.message }, { status: 500 });
    }
    
    console.log(`[debug-cron-query] Total casts in database: ${allCasts?.length || 0}`);
    
    // Now let's test the exact cron job query
    const { data: cronCasts, error: cronError } = await supabase
      .from('scheduled_casts')
      .select('*')
      .lte('scheduled_at', currentTime)
      .eq('posted', false)
      .or(`error.is.null,updated_at.lt.${twentyFourHoursAgo}`);
    
    if (cronError) {
      console.error('[debug-cron-query] Error with cron query:', cronError);
      return NextResponse.json({ error: cronError.message }, { status: 500 });
    }
    
    console.log(`[debug-cron-query] Casts found by cron query: ${cronCasts?.length || 0}`);
    
    return NextResponse.json({
      success: true,
      currentTime,
      twentyFourHoursAgo,
      totalCasts: allCasts?.length || 0,
      cronFoundCasts: cronCasts?.length || 0,
      allCasts: allCasts?.map(cast => ({
        id: cast.id,
        content: cast.content,
        scheduled_at: cast.scheduled_at,
        posted: cast.posted,
        error: cast.error,
        updated_at: cast.updated_at,
        fid: cast.fid,
        signer_uuid: cast.signer_uuid
      })),
      cronCasts: cronCasts?.map(cast => ({
        id: cast.id,
        content: cast.content,
        scheduled_at: cast.scheduled_at,
        posted: cast.posted,
        error: cast.error,
        updated_at: cast.updated_at,
        fid: cast.fid,
        signer_uuid: cast.signer_uuid
      }))
    });
  } catch (error) {
    console.error('[debug-cron-query] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 