import { NextRequest, NextResponse } from "next/server";
import { postCastDirect, createSignerDirect } from "@/lib/neynar";

/**
 * Test endpoint to directly post a cast without scheduling
 * 
 * This helps isolate whether the issue is with scheduling or with the Neynar API
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[test/post-cast] Starting direct cast test');
    
    // Parse the request body
    const body = await request.json();
    const { content, useExistingSigner, signerUuid } = body;
    
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }
    
    console.log(`[test/post-cast] Content: "${content}"`);
    console.log(`[test/post-cast] Using existing signer: ${useExistingSigner ? 'Yes' : 'No'}`);
    if (useExistingSigner) {
      console.log(`[test/post-cast] Signer UUID: ${signerUuid || 'Not provided'}`);
    }
    
    // Create a new signer or use the provided one
    let effectiveSignerUuid: string;
    
    if (useExistingSigner && signerUuid) {
      console.log(`[test/post-cast] Using provided signer: ${signerUuid}`);
      effectiveSignerUuid = signerUuid;
    } else {
      console.log('[test/post-cast] Creating new signer...');
      try {
        const signer = await createSignerDirect();
        effectiveSignerUuid = signer.signer_uuid;
        console.log(`[test/post-cast] Created new signer: ${effectiveSignerUuid}`);
      } catch (signerError) {
        console.error('[test/post-cast] Failed to create signer:', signerError);
        return NextResponse.json({ 
          error: 'Failed to create signer',
          details: signerError instanceof Error ? signerError.message : String(signerError)
        }, { status: 500 });
      }
    }
    
    // Post the cast
    try {
      console.log(`[test/post-cast] Posting cast with signer: ${effectiveSignerUuid}`);
      const result = await postCastDirect(effectiveSignerUuid, content);
      console.log('[test/post-cast] Cast posted successfully');
      
      return NextResponse.json({
        success: true,
        message: 'Cast posted successfully',
        cast: result,
        signer_uuid: effectiveSignerUuid
      });
    } catch (postError) {
      console.error('[test/post-cast] Failed to post cast:', postError);
      return NextResponse.json({ 
        error: 'Failed to post cast',
        details: postError instanceof Error ? postError.message : String(postError)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[test/post-cast] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * GET method to create a signer and return it without posting a cast
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[test/post-cast] Creating test signer');
    
    // Create a new signer
    try {
      const signer = await createSignerDirect();
      console.log(`[test/post-cast] Created new signer: ${signer.signer_uuid}`);
      
      return NextResponse.json({
        success: true,
        message: 'Signer created successfully',
        signer
      });
    } catch (signerError) {
      console.error('[test/post-cast] Failed to create signer:', signerError);
      return NextResponse.json({ 
        error: 'Failed to create signer',
        details: signerError instanceof Error ? signerError.message : String(signerError)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[test/post-cast] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 