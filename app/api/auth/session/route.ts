import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get FID from request headers or query params (set by SIWN)
    const fid = request.headers.get('x-fid') || request.nextUrl.searchParams.get('fid');
    
    if (!fid) {
      return NextResponse.json({ session: null });
    }
    
    // Fetch user data from our custom users table
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('fid', parseInt(fid))
      .single();
    
    if (error || !userData) {
      console.log(`[session] User with FID ${fid} not found in database`);
      return NextResponse.json({ session: null });
    }
    
    // Return user data in the format expected by AuthContext
    return NextResponse.json({
      fid: userData.fid,
      username: userData.username,
      displayName: userData.display_name,
      avatar: userData.avatar,
      signer_uuid: userData.signer_uuid,
      delegated: userData.delegated || false,
    });
  } catch (err) {
    console.error('[session] Error fetching session:', err);
    return NextResponse.json({ session: null });
  }
} 