import { Configuration, NeynarAPIClient } from "@neynar/nodejs-sdk";

if (!process.env.NEYNAR_API_KEY) {
  throw new Error("Make sure you set NEYNAR_API_KEY in your .env.local file");
}

const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY,
  basePath: "https://api.neynar.com",
});

const neynarClient = new NeynarAPIClient(config);

export default neynarClient; 