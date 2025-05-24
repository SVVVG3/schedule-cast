import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSignerInfo } from '@/lib/neynar';

export async function GET(request: NextRequest) {
  try {
    // Get all scheduled casts that failed
    const { data: failedCasts, error } = await supabase
      .from('scheduled_casts')
      .select('fid, signer_uuid')
      .eq('posted', false)
      .order('fid');
    
    if (error) {
      throw error;
    }
    
    // Get unique FIDs
    const uniqueFids = Array.from(new Set((failedCasts || []).map(cast => cast.fid)));
    console.log('Checking FIDs:', uniqueFids);
    
    const results = [];
    
    for (const fid of uniqueFids) {
      try {
        // Get user's current signer
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('fid, signer_uuid, signer_status')
          .eq('fid', fid)
          .single();
        
        if (userError) {
          results.push({
            fid: fid,
            error: `No user record found: ${userError.message}`,
            needsNewSigner: true
          });
          continue;
        }
        
        // Check if current signer is working
        let currentSignerWorking = false;
        let currentSignerStatus = 'unknown';
        
        if (userData.signer_uuid) {
          try {
            const signerInfo = await getSignerInfo(userData.signer_uuid);
            currentSignerStatus = signerInfo.status || 'unknown';
            currentSignerWorking = currentSignerStatus === 'approved';
          } catch (err) {
            console.log(`Signer ${userData.signer_uuid} not found or invalid`);
          }
        }
        
        // Get all cast signers for this FID to check if any are working
        const castSigners = (failedCasts || [])
          .filter(cast => cast.fid === fid)
          .map(cast => cast.signer_uuid)
          .filter((signer, index, arr) => arr.indexOf(signer) === index); // unique
        
        const signerStatuses = [];
        
        for (const castSigner of castSigners) {
          try {
            const signerInfo = await getSignerInfo(castSigner);
            signerStatuses.push({
              signer: castSigner,
              status: signerInfo.status || 'unknown',
              working: signerInfo.status === 'approved'
            });
          } catch (err) {
            signerStatuses.push({
              signer: castSigner,
              status: 'not_found',
              working: false,
              error: (err as Error).message
            });
          }
        }
        
        const hasWorkingSigner = currentSignerWorking || signerStatuses.some(s => s.working);
        
        results.push({
          fid: fid,
          currentSigner: userData.signer_uuid,
          currentSignerStatus: currentSignerStatus,
          currentSignerWorking: currentSignerWorking,
          castSigners: signerStatuses,
          hasWorkingSigner: hasWorkingSigner,
          needsApproval: !hasWorkingSigner
        });
        
      } catch (err) {
        results.push({
          fid: fid,
          error: (err as Error).message,
          needsNewSigner: true
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Checked ${uniqueFids.length} FIDs`,
      results: results,
      summary: {
        totalFids: uniqueFids.length,
        withWorkingSigners: results.filter(r => r.hasWorkingSigner).length,
        needingApproval: results.filter(r => r.needsApproval).length
      }
    });
  } catch (error) {
    console.error('[find-approved-signers] Error:', error);
    return NextResponse.json({ 
      error: (error as Error).message,
      details: error
    }, { status: 500 });
  }
} 