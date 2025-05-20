import { Configuration, NeynarAPIClient } from "@neynar/nodejs-sdk";

if (!process.env.NEYNAR_API_KEY) {
  throw new Error("Make sure you set NEYNAR_API_KEY in your .env.local file");
}

// Add check for client ID
if (!process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID) {
  console.warn("NEXT_PUBLIC_NEYNAR_CLIENT_ID is not set. This may be required for some Neynar operations.");
}

// Prepare the Neynar client configuration
const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY,
  basePath: "https://api.neynar.com",
});

// Create the Neynar client
const neynarClient = new NeynarAPIClient(config);

// Note: For newer Neynar API requirements including payment, 
// use the direct fetch API instead of the SDK for certain operations

export default neynarClient; 