import { getSignedKey } from "@/utils/getSignedKey";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    console.log('[api/signer] Received request to create a new signer');
    
    // Check if we have an FID in the request body
    let fid: number | undefined;
    try {
      const body = await request.json();
      fid = body.fid ? Number(body.fid) : undefined;
      console.log('[api/signer] Request includes FID:', fid);
    } catch (error) {
      console.log('[api/signer] No request body or invalid JSON');
      // Continue without an FID
    }
    
    // Create the signer
    console.log('[api/signer] Creating new signer', fid ? `for FID: ${fid}` : 'as app signer');
    const signerInfo = await getSignedKey(fid);
    
    console.log('[api/signer] Signer created successfully:', signerInfo.signer_uuid);
    return NextResponse.json(signerInfo, { status: 200 });
  } catch (error) {
    console.error('[api/signer] Error creating signer:', error);
    return NextResponse.json({ 
      error: "Failed to create signer",
      message: (error as Error).message
    }, { status: 500 });
  }
} 