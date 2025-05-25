import { NextResponse } from "next/server";
import neynarClient from "@/lib/neynarClient";

export async function GET() {
  try {
    const address = "0xDC6d879fA2f31813b9287817193580D62DfE776D";
    
    console.log('[test-neynar-lookup] Looking up address:', address);
    
    const result = await neynarClient.lookupUserByCustodyAddress({
      custodyAddress: address,
    });
    
    console.log('[test-neynar-lookup] Success:', result);
    
    return NextResponse.json({
      success: true,
      user: result.user,
      fid: result.user.fid
    });
  } catch (error) {
    console.error('[test-neynar-lookup] Error:', error);
    
    return NextResponse.json({ 
      error: "Lookup failed",
      details: error instanceof Error ? error.message : 'Unknown error',
      errorType: typeof error,
      errorString: String(error)
    });
  }
} 