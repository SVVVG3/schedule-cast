import { NextResponse } from 'next/server';

/**
 * Test different app_fid approaches for developer managed signers
 */
export async function POST(request: Request) {
  try {
    if (!process.env.NEYNAR_API_KEY) {
      return NextResponse.json(
        { error: 'NEYNAR_API_KEY missing' },
        { status: 500 }
      );
    }

    const results: any = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    // Test 1: Try without app_fid (see what error we get)
    console.log('[test] Testing without app_fid parameter');
    try {
      const response1 = await fetch("https://api.neynar.com/v2/farcaster/signer/developer_managed/signed_key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEYNAR_API_KEY
        },
        body: JSON.stringify({})
      });
      
      const data1 = await response1.json();
      results.tests.push({
        test: 'No app_fid',
        success: response1.ok,
        status: response1.status,
        response: data1
      });
    } catch (error) {
      results.tests.push({
        test: 'No app_fid',
        success: false,
        error: (error as Error).message
      });
    }

    // Test 2: Try with a common system FID (like 1 or 2)
    console.log('[test] Testing with system FID');
    try {
      const response2 = await fetch("https://api.neynar.com/v2/farcaster/signer/developer_managed/signed_key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEYNAR_API_KEY
        },
        body: JSON.stringify({
          app_fid: 1 // Trying system FID
        })
      });
      
      const data2 = await response2.json();
      results.tests.push({
        test: 'System FID (1)',
        success: response2.ok,
        status: response2.status,
        response: data2
      });
    } catch (error) {
      results.tests.push({
        test: 'System FID (1)',
        success: false,
        error: (error as Error).message
      });
    }

    // Test 3: Try with user's FID as app_fid (your FID)
    console.log('[test] Testing with user FID as app_fid');
    try {
      const response3 = await fetch("https://api.neynar.com/v2/farcaster/signer/developer_managed/signed_key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEYNAR_API_KEY
        },
        body: JSON.stringify({
          app_fid: 466111 // Your FID
        })
      });
      
      const data3 = await response3.json();
      results.tests.push({
        test: 'User FID (466111)',
        success: response3.ok,
        status: response3.status,
        response: data3
      });
    } catch (error) {
      results.tests.push({
        test: 'User FID (466111)',
        success: false,
        error: (error as Error).message
      });
    }

    // Test 4: Check if there's an app info endpoint to get app FID
    console.log('[test] Testing app info endpoint');
    try {
      const response4 = await fetch("https://api.neynar.com/v2/farcaster/app", {
        method: "GET",
        headers: {
          "x-api-key": process.env.NEYNAR_API_KEY
        }
      });
      
      const data4 = await response4.json();
      results.tests.push({
        test: 'App info endpoint',
        success: response4.ok,
        status: response4.status,
        response: data4,
        note: 'Checking if Neynar provides an app FID'
      });
    } catch (error) {
      results.tests.push({
        test: 'App info endpoint',
        success: false,
        error: (error as Error).message
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Signer creation method tests completed',
      client_id: '3bc04533-6297-438b-8d85-e655f3fc19f9',
      results: results
    });
  } catch (error) {
    console.error('[test/signer-creation-methods] Error:', error);
    return NextResponse.json(
      { error: `Test failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 