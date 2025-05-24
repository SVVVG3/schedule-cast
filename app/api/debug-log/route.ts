import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Store debug events in database
export async function POST(request: NextRequest) {
  try {
    const { event, data, fid } = await request.json();
    
    const { error } = await supabase
      .from('debug_logs')
      .insert({
        event,
        data: JSON.stringify(data),
        fid: fid || null,
        timestamp: new Date().toISOString(),
        user_agent: request.headers.get('user-agent') || 'unknown'
      });
    
    if (error) {
      console.error('[debug-log] Error storing log:', error);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[debug-log] Failed to store debug log:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

// Get recent debug events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    let query = supabase
      .from('debug_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (fid) {
      query = query.eq('fid', parseInt(fid));
    }
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ logs: data || [] });
  } catch (error) {
    console.error('[debug-log] Error fetching logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 