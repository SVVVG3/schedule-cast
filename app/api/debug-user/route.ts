import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');
    
    if (!fid) {
      return NextResponse.json({ error: 'FID required' }, { status: 400 });
    }
    
    console.log(`[debug-user] Checking database for FID: ${fid}`);
    
    // Check if user exists in database
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('fid', parseInt(fid))
      .single();
    
    if (error) {
      console.log(`[debug-user] Database error:`, error);
      return NextResponse.json({ 
        exists: false, 
        error: error.message,
        fid: parseInt(fid)
      });
    }
    
    if (!userData) {
      console.log(`[debug-user] No user found for FID ${fid}`);
      return NextResponse.json({ 
        exists: false, 
        fid: parseInt(fid),
        message: 'User not found in database'
      });
    }
    
    console.log(`[debug-user] User found:`, userData);
    return NextResponse.json({
      exists: true,
      fid: parseInt(fid),
      user: userData,
      has_signer: !!userData.signer_uuid,
      is_delegated: !!userData.delegated,
      created_at: userData.created_at,
      updated_at: userData.updated_at
    });
    
  } catch (error) {
    console.error('[debug-user] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 