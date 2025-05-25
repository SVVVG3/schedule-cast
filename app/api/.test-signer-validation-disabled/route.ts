import { NextRequest, NextResponse } from 'next/server';
import { validateAndRefreshSigner } from '@/lib/neynar';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const signerUuid = searchParams.get('signer_uuid');
    const fid = searchParams.get('fid');
    
    if (!signerUuid || !fid) {
      return NextResponse.json({ 
        error: 'signer_uuid and fid query parameters are required' 
      }, { status: 400 });
    }
    
    console.log(`[test-signer-validation] Testing signer ${signerUuid} for FID ${fid}`);
    
    // Test the validateAndRefreshSigner function
    const result = await validateAndRefreshSigner(signerUuid, parseInt(fid));
    
    console.log(`[test-signer-validation] Result:`, result);
    
    return NextResponse.json({
      success: true,
      message: 'Signer validation test completed',
      result: result
    });
  } catch (error) {
    console.error('[test-signer-validation] Error:', error);
    return NextResponse.json({ 
      error: (error as Error).message,
      details: error
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Test with failed casts from the database
    console.log(`[test-signer-validation] Testing with failed scheduled casts`);
    
    // Get some failed scheduled casts to test with
    const { data: failedCasts, error } = await supabase
      .from('scheduled_casts')
      .select('*')
      .eq('posted', false)
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (error) {
      throw error;
    }
    
    if (!failedCasts || failedCasts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No failed casts found to test with'
      });
    }
    
    const results = [];
    
    for (const cast of failedCasts) {
      try {
        console.log(`[test-signer-validation] Testing cast ${cast.id} with signer ${cast.signer_uuid} for FID ${cast.fid}`);
        
        const result = await validateAndRefreshSigner(cast.signer_uuid, cast.fid);
        
        results.push({
          castId: cast.id,
          fid: cast.fid,
          originalSigner: cast.signer_uuid,
          validationResult: result,
          success: true
        });
      } catch (testError) {
        results.push({
          castId: cast.id,
          fid: cast.fid,
          originalSigner: cast.signer_uuid,
          error: (testError as Error).message,
          success: false
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Tested ${failedCasts.length} failed casts`,
      results: results
    });
  } catch (error) {
    console.error('[test-signer-validation] Error:', error);
    return NextResponse.json({ 
      error: (error as Error).message,
      details: error
    }, { status: 500 });
  }
} 