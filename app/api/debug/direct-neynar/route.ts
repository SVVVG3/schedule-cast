import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const apiKey = process.env.NEYNAR_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: "NEYNAR_API_KEY not set" }, { status: 500 });
    }
    
    // Log the API key for debugging (first few characters only)
    console.log(`[direct-neynar] API key starts with: ${apiKey.substring(0, 5)}...`);
    
    // Try to make a direct API call to create a signer
    const response = await fetch("https://api.neynar.com/v2/farcaster/signer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api_key": apiKey
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        success: true,
        data,
        message: "Successfully created signer via direct API call"
      });
    } else {
      const errorText = await response.text();
      return NextResponse.json({
        success: false,
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        message: "Failed to create signer via direct API call"
      });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: "Exception occurred while making direct API call"
    }, { status: 500 });
  }
} 