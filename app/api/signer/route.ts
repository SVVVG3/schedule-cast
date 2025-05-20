import { getSignedKey } from "@/utils/getSignedKey";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    console.log('[api/signer] Creating new signer');
    const signedKey = await getSignedKey();
    console.log('[api/signer] Signer created:', signedKey);
    return NextResponse.json(signedKey, { status: 200 });
  } catch (error) {
    console.error('[api/signer] Error creating signer:', error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
} 