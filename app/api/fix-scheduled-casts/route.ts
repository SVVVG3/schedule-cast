import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('[fix-scheduled-casts] Starting fix for scheduled casts');
    
    // Clear error messages from scheduled casts so they can be processed
    const { data: fixedCasts, error } = await supabase
      .from('scheduled_casts')
      .update({ 
        error: null,
        updated_at: new Date().toISOString()
      })
      .eq('posted', false)
      .not('error', 'is', null)
      .select();
    
    if (error) {
      console.error('[fix-scheduled-casts] Error clearing cast errors:', error);
      return NextResponse.json({ 
        error: 'Failed to clear cast errors',
        details: error.message 
      }, { status: 500 });
    }
    
    console.log(`[fix-scheduled-casts] Cleared errors from ${fixedCasts?.length || 0} casts`);
    
    return NextResponse.json({
      success: true,
      message: `Cleared errors from ${fixedCasts?.length || 0} scheduled casts`,
      fixed_casts: fixedCasts?.map(cast => ({
        id: cast.id,
        content: cast.content,
        scheduled_at: cast.scheduled_at
      }))
    });
  } catch (error) {
    console.error('[fix-scheduled-casts] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 