import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSignerInfo } from '@/lib/neynar';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');
    
    if (!fid) {
      return NextResponse.json({ 
        error: 'fid query parameter is required' 
      }, { status: 400 });
    }

    console.log(`[debug-siwn] Debugging SIWN for FID ${fid}`);
    
    // Get the user's current SIWN data
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('fid', parseInt(fid))
      .single();
    
    if (error) {
      return NextResponse.json({ 
        error: `No user found for FID ${fid}`,
        details: error
      }, { status: 404 });
    }

    const results: any = {
      fid: parseInt(fid),
      user_data: userData,
      tests: {}
    };

    // Test 1: Check if SIWN signer exists and its status
    if (userData.signer_uuid) {
      try {
        console.log(`[debug-siwn] Checking SIWN signer ${userData.signer_uuid}`);
        const signerInfo = await getSignerInfo(userData.signer_uuid);
        results.tests.signer_exists = {
          success: true,
          signer_uuid: userData.signer_uuid,
          status: signerInfo.status,
          details: signerInfo
        };
      } catch (error: any) {
        console.error(`[debug-siwn] SIWN signer not found:`, error);
        results.tests.signer_exists = {
          success: false,
          signer_uuid: userData.signer_uuid,
          error: error.message,
          status_code: error.status || 'unknown'
        };
      }
    } else {
      results.tests.signer_exists = {
        success: false,
        error: 'No signer_uuid found in user data'
      };
    }

    // Test 2: What should happen when we receive SIWN data?
    results.analysis = {
      message: "SIWN should provide pre-approved signers, but this one appears unapproved",
      possible_causes: [
        "SIWN flow didn't complete properly",
        "Delay between SIWN approval and signer activation in Neynar",
        "Signer needs additional registration step",
        "Wrong signer UUID being stored"
      ],
      next_steps: [
        "Check if we need to poll for signer activation",
        "Verify SIWN callback data is correct",
        "Test immediate posting after SIWN success"
      ]
    };

    return NextResponse.json({
      success: true,
      message: 'SIWN debug completed',
      results
    });
    
  } catch (error) {
    console.error('Error debugging SIWN:', error);
    return NextResponse.json({ 
      error: 'Failed to debug SIWN',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 