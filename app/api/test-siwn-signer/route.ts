import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { postCastDirect, getSignerInfo } from '@/lib/neynar';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');
    
    if (!fid) {
      return NextResponse.json({ 
        error: 'fid query parameter is required' 
      }, { status: 400 });
    }
    
    // Get the user's SIWN signer from the database
    const { data: userData, error } = await supabase
      .from('users')
      .select('signer_uuid, created_at, username')
      .eq('fid', parseInt(fid))
      .single();
    
    if (error) {
      return NextResponse.json({ 
        error: `No user found for FID ${fid}`,
        details: error
      }, { status: 404 });
    }
    
    console.log(`[test-siwn-signer] Testing SIWN signer ${userData.signer_uuid} for FID ${fid}`);
    
    const results: any = {
      fid: parseInt(fid),
      siwn_signer_uuid: userData.signer_uuid,
      user_created: userData.created_at,
      username: userData.username,
      tests: {}
    };
    
    // Test 1: Check if the SIWN signer exists in Neynar
    try {
      const signerInfo = await getSignerInfo(userData.signer_uuid);
      results.tests.signer_info = {
        success: true,
        status: signerInfo.status,
        data: signerInfo
      };
    } catch (error: any) {
      results.tests.signer_info = {
        success: false,
        error: error.message,
        status_code: error.status || 'unknown'
      };
    }
    
    // Test 2: Try to post a test cast with the SIWN signer
    try {
      const testCast = await postCastDirect(
        userData.signer_uuid,
        `🧪 Test cast from Schedule-Cast using SIWN signer ${userData.signer_uuid.slice(0, 8)}... - ${new Date().toISOString()}`,
        undefined
      );
      
      results.tests.post_cast = {
        success: true,
        message: 'SIWN signer can post casts!',
        cast_data: testCast
      };
    } catch (error: any) {
      results.tests.post_cast = {
        success: false,
        error: error.message,
        error_code: error.code || 'unknown',
        status_code: error.status || 'unknown'
      };
    }
    
    // Test 3: Check all scheduled casts for this user
    const { data: scheduledCasts } = await supabase
      .from('scheduled_casts')
      .select('id, signer_uuid, created_at, posted, error')
      .eq('fid', parseInt(fid))
      .order('created_at', { ascending: false })
      .limit(5);
    
    results.tests.scheduled_casts = {
      count: scheduledCasts?.length || 0,
      casts: scheduledCasts || [],
      signer_consistency: scheduledCasts?.every(cast => cast.signer_uuid === userData.signer_uuid) || false
    };
    
    return NextResponse.json({
      success: true,
      message: 'SIWN signer test completed',
      results
    });
    
  } catch (error) {
    console.error('Error testing SIWN signer:', error);
    return NextResponse.json({ 
      error: 'Failed to test SIWN signer',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 