import { getSignedKey } from "@/utils/getSignedKey";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    console.log('[signer/route] Starting signer creation...');
    const signedKey = await getSignedKey();
    console.log('[signer/route] Signer created successfully:', signedKey);
    return NextResponse.json(signedKey, { status: 200 });
  } catch (error) {
    console.error('[signer/route] Error creating signer:', error);
    return NextResponse.json({ 
      error: "An error occurred",
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 