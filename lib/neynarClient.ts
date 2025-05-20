import { Configuration, NeynarAPIClient } from "@neynar/nodejs-sdk";

if (!process.env.NEYNAR_API_KEY) {
  throw new Error("Make sure you set NEYNAR_API_KEY in your .env.local file");
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