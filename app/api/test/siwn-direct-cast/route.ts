import { NextResponse } from 'next/server';

/**
 * Test posting a cast directly with SIWN signer UUID
 * This bypasses our database and tests the SIWN signer directly
 */
export async function POST(request: Request) {
  try {
    const { signer_uuid, content } = await request.json();

    if (!signer_uuid || !content) {
      return NextResponse.json(
        { error: 'Missing signer_uuid or content' },
        { status: 400 }
      );
    }

    console.log(`[test-siwn-direct] Testing cast with signer: ${signer_uuid}`);
    console.log(`[test-siwn-direct] Content: ${content}`);

    // Post directly to Neynar API using the SIWN signer
    const response = await fetch('https://api.neynar.com/v2/farcaster/cast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NEYNAR_API_KEY!
      },
      body: JSON.stringify({
        signer_uuid: signer_uuid,
        text: content
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[test-siwn-direct] Failed to post cast:', result);
      return NextResponse.json({
        success: false,
        error: `Failed to post cast: ${result.message || result.error}`,
        status: response.status,
        details: result
      }, { status: response.status });
    }

    console.log('[test-siwn-direct] Cast posted successfully:', result.hash);

    return NextResponse.json({
      success: true,
      message: 'Cast posted successfully',
      hash: result.hash,
      signer_uuid: signer_uuid
    });

  } catch (error) {
    console.error('[test-siwn-direct] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: `Unexpected error: ${(error as Error).message}`
    }, { status: 500 });
  }
} 