import { NextResponse } from "next/server";
import { mnemonicToAccount } from "viem/accounts";

export async function GET() {
  try {
    if (!process.env.FARCASTER_DEVELOPER_MNEMONIC) {
      return NextResponse.json({ error: "FARCASTER_DEVELOPER_MNEMONIC not set" });
    }

    const account = mnemonicToAccount(process.env.FARCASTER_DEVELOPER_MNEMONIC);
    
    return NextResponse.json({
      address: account.address,
      mnemonic_preview: process.env.FARCASTER_DEVELOPER_MNEMONIC.split(' ').slice(0, 3).join(' ') + '...'
    });
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to process mnemonic",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 