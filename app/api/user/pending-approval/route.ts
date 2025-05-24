import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');
    
    if (!fid) {
      return NextResponse.json({ 
        error: 'fid query parameter is required' 
      }, { status: 400 });
    }
    
    // Get all scheduled casts for this user that need approval
    const { data: pendingCasts, error } = await supabase
      .from('scheduled_casts')
      .select('id, content, scheduled_at, error, created_at')
      .eq('fid', parseInt(fid))
      .eq('posted', false)
      .ilike('error', '%approval%');
    
    if (error) {
      throw error;
    }
    
    // Get user's signer approval URL
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('signer_approval_url, signer_status')
      .eq('fid', parseInt(fid))
      .single();
    
    if (userError && userError.code !== 'PGRST116') {
      throw userError;
    }
    
    return NextResponse.json({
      fid: parseInt(fid),
      pending_casts_count: pendingCasts?.length || 0,
      pending_casts: pendingCasts || [],
      signer_status: userData?.signer_status || 'unknown',
      signer_approval_url: userData?.signer_approval_url || null,
      message: pendingCasts && pendingCasts.length > 0 
        ? `You have ${pendingCasts.length} scheduled casts waiting for signer approval`
        : 'No pending casts waiting for approval'
    });
    
  } catch (error) {
    console.error('Error checking pending approval:', error);
    return NextResponse.json({ 
      error: 'Failed to check pending casts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 