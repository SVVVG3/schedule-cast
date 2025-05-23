import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { 
  createSignerDirect, 
  getSignerInfo, 
  postCastDirect, 
  validateAndRefreshSigner,
  retryWithBackoff 
} from '@/lib/neynar';

/**
 * Comprehensive test endpoint for Neynar implementation
 * 
 * This endpoint tests our implementation against the Neynar documentation:
 * - Signer creation using developer managed signers
 * - Proper API headers (x-api-key)
 * - Rate limiting and retry logic
 * - Signer validation and approval flow
 */
export async function POST(request: Request) {
  try {
    const { fid, test_type, content } = await request.json();
    
    if (!fid) {
      return NextResponse.json(
        { error: 'Missing fid parameter' },
        { status: 400 }
      );
    }
    
    const testType = test_type || 'full';
    console.log(`[test/neynar-implementation] Running ${testType} test for FID ${fid}`);
    
    const results: any = {
      test_type: testType,
      fid: fid,
      timestamp: new Date().toISOString(),
      steps: []
    };
    
    try {
      // Step 1: Check current user state
      console.log('[test] Step 1: Checking current user state');
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('fid', fid)
        .maybeSingle();
      
      results.steps.push({
        step: 1,
        name: 'Check current user state',
        success: !userError,
        data: user || null,
        error: userError?.message || null
      });
      
      if (userError || !user) {
        throw new Error(`User not found or error: ${userError?.message}`);
      }
      
      // Step 2: Test signer info retrieval (if user has a signer)
      if (user.signer_uuid && testType !== 'create_only') {
        console.log('[test] Step 2: Testing signer info retrieval');
        try {
          const signerInfo = await retryWithBackoff(() => getSignerInfo(user.signer_uuid));
          results.steps.push({
            step: 2,
            name: 'Get existing signer info',
            success: true,
            data: signerInfo
          });
        } catch (signerError: any) {
          results.steps.push({
            step: 2,
            name: 'Get existing signer info',
            success: false,
            error: signerError.message,
            note: 'This is expected if signer is invalid/expired'
          });
        }
      }
      
      // Step 3: Test signer creation
      if (testType === 'create_only' || testType === 'full') {
        console.log('[test] Step 3: Testing signer creation');
        try {
          const newSigner = await retryWithBackoff(() => createSignerDirect());
          results.steps.push({
            step: 3,
            name: 'Create new signer',
            success: true,
            data: {
              signer_uuid: newSigner.signer_uuid,
              status: newSigner.status,
              signer_approval_url: newSigner.signer_approval_url,
              approved: newSigner.approved
            }
          });
          
          // Update user with new signer for testing
          await supabase
            .from('users')
            .update({
              signer_uuid: newSigner.signer_uuid,
              signer_status: newSigner.status,
              signer_approval_url: newSigner.signer_approval_url,
              needs_signer_approval: !newSigner.approved
            })
            .eq('fid', fid);
            
        } catch (signerError: any) {
          results.steps.push({
            step: 3,
            name: 'Create new signer',
            success: false,
            error: signerError.message
          });
        }
      }
      
      // Step 4: Test signer validation and refresh
      if (testType === 'validate' || testType === 'full') {
        console.log('[test] Step 4: Testing signer validation');
        try {
          const validation = await validateAndRefreshSigner(user.signer_uuid, fid);
          results.steps.push({
            step: 4,
            name: 'Validate and refresh signer',
            success: true,
            data: validation
          });
        } catch (validationError: any) {
          results.steps.push({
            step: 4,
            name: 'Validate and refresh signer',
            success: false,
            error: validationError.message,
            note: 'This is expected if signer needs approval'
          });
        }
      }
      
      // Step 5: Test cast posting (only if content provided and signer is approved)
      if (content && (testType === 'cast' || testType === 'full')) {
        console.log('[test] Step 5: Testing cast posting');
        
        // Get the latest user data after potential signer updates
        const { data: updatedUser } = await supabase
          .from('users')
          .select('signer_uuid, signer_status')
          .eq('fid', fid)
          .maybeSingle();
        
        if (updatedUser?.signer_uuid && updatedUser.signer_status === 'approved') {
          try {
            const castResult = await postCastDirect(updatedUser.signer_uuid, content);
            results.steps.push({
              step: 5,
              name: 'Post test cast',
              success: true,
              data: { cast_hash: castResult.cast?.hash || 'unknown' }
            });
          } catch (castError: any) {
            results.steps.push({
              step: 5,
              name: 'Post test cast',
              success: false,
              error: castError.message
            });
          }
        } else {
          results.steps.push({
            step: 5,
            name: 'Post test cast',
            success: false,
            error: 'Signer not approved or missing',
            note: 'User needs to approve signer first'
          });
        }
      }
      
      // Summary
      const successfulSteps = results.steps.filter((s: any) => s.success).length;
      const totalSteps = results.steps.length;
      
      results.summary = {
        success_rate: `${successfulSteps}/${totalSteps}`,
        overall_success: successfulSteps === totalSteps,
        needs_action: results.steps.some((s: any) => s.error?.includes('approval'))
      };
      
      console.log(`[test] Test completed: ${successfulSteps}/${totalSteps} steps successful`);
      
      return NextResponse.json({
        success: true,
        message: 'Neynar implementation test completed',
        results: results
      });
      
    } catch (testError: any) {
      console.error('[test] Test failed:', testError);
      results.error = testError.message;
      results.success = false;
      
      return NextResponse.json({
        success: false,
        message: 'Test failed',
        results: results
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[test/neynar-implementation] Unexpected error:', error);
    return NextResponse.json(
      { error: `Test failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 