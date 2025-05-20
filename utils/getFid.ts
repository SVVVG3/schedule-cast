import neynarClient from "@/lib/neynarClient";
import { mnemonicToAccount } from "viem/accounts";

/**
 * Get the app FID for signer registration
 * 
 * In a production app, you would:
 * 1. Register your mnemonic with Farcaster to get an app FID
 * 2. Use that registered FID for signer creation
 * 
 * For development/testing, we can:
 * - Use a hardcoded FID (any valid number will work for testing)
 * - Or derive a deterministic "fake" FID from the mnemonic
 */
export const getFid = async () => {
  // Check if we have a mnemonic
  if (!process.env.FARCASTER_DEVELOPER_MNEMONIC) {
    throw new Error("FARCASTER_DEVELOPER_MNEMONIC is not set.");
  }

  // OPTION 1: Use a hardcoded FID for testing
  // This works for development but in production you'd need a real registered FID
  return 1; // Use any number as app_fid for testing

  /* OPTION 2: For production, use the real FID lookup:
  const account = mnemonicToAccount(process.env.FARCASTER_DEVELOPER_MNEMONIC);

  try {
    const { user: farcasterDeveloper } =
      await neynarClient.lookupUserByCustodyAddress({
        custodyAddress: account.address,
      });

    return Number(farcasterDeveloper.fid);
  } catch (error) {
    console.error("Error looking up FID from custody address:", error);
    throw new Error("Failed to get FID. Make sure your mnemonic is registered with Farcaster.");
  }
  */
}; 