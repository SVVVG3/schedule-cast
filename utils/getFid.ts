import neynarClient from "@/lib/neynarClient";
import { mnemonicToAccount } from "viem/accounts";

export const getFid = async () => {
  if (!process.env.FARCASTER_DEVELOPER_MNEMONIC) {
    throw new Error("FARCASTER_DEVELOPER_MNEMONIC is not set.");
  }

  try {
    console.log('[getFid] Using mnemonic to get account...');
    const account = mnemonicToAccount(process.env.FARCASTER_DEVELOPER_MNEMONIC);
    console.log('[getFid] Account address:', account.address);

    console.log('[getFid] Looking up user by custody address...');
    const result = await neynarClient.lookupUserByCustodyAddress({
      custodyAddress: account.address,
    });

    console.log('[getFid] API response:', result);
    const farcasterDeveloper = result.user;
    console.log('[getFid] Found developer FID:', farcasterDeveloper.fid);
    return Number(farcasterDeveloper.fid);
  } catch (error) {
    console.error('[getFid] Error details:', error);
    console.error('[getFid] Error type:', typeof error);
    console.error('[getFid] Error keys:', error ? Object.keys(error) : 'no keys');
    throw new Error(`Failed to get FID: ${error}`);
  }
}; 