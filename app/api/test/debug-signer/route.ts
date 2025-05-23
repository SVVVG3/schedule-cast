import { NextResponse } from 'next/server';

/**
 * Debug endpoint to test raw Neynar API responses
 */
export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    if (action === 'test_signer_creation') {
      // Test direct API call to see the exact response
      const response = await fetch("https://api.neynar.com/v2/farcaster/signer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEYNAR_API_KEY!
        },
        body: JSON.stringify({
          sponsored_by_neynar: true
        })
      });

      const rawResponse = await response.text();
      let parsedData;
      
      try {
        parsedData = JSON.parse(rawResponse);
      } catch {
        parsedData = null;
      }

      return NextResponse.json({
        success: response.ok,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        raw_response: rawResponse,
        parsed_data: parsedData,
        potential_urls: parsedData ? [
          `https://client.warpcast.com/deeplinks/signed-key-request?token=${parsedData.signer_uuid}`,
          `https://warpcast.com/~/signin?token=${parsedData.signer_uuid}`,
          `warpcast://signin?token=${parsedData.signer_uuid}`,
          parsedData.signer_approval_url
        ].filter(Boolean) : []
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[debug-signer] Error:', error);
    return NextResponse.json(
      { error: `Debug error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 