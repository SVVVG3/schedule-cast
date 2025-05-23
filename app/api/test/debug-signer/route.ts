import { NextResponse } from 'next/server';

/**
 * Debug endpoint to test raw Neynar API responses
 */
export async function POST(request: Request) {
  try {
    const { action, signer_uuid } = await request.json();

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
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        rawResponse,
        parsedData,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'check_signer' && signer_uuid) {
      // Check signer status directly
      const response = await fetch(`https://api.neynar.com/v2/farcaster/signer/${signer_uuid}`, {
        method: "GET",
        headers: {
          "x-api-key": process.env.NEYNAR_API_KEY!
        }
      });

      const rawResponse = await response.text();
      let parsedData;
      
      try {
        parsedData = JSON.parse(rawResponse);
      } catch {
        parsedData = null;
      }

      return NextResponse.json({
        signer_uuid,
        status: response.status,
        statusText: response.statusText,
        rawResponse,
        parsedData,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ error: 'Invalid action or missing parameters' }, { status: 400 });

  } catch (error) {
    return NextResponse.json({
      error: 'Debug endpoint error',
      details: (error as Error).message
    }, { status: 500 });
  }
} 