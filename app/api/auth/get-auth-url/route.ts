import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || '3bc04533-6297-438b-8d85-e655f3fc19f9';
    const apiKey = process.env.NEYNAR_API_KEY;
    
    if (!apiKey) {
      console.error('[get-auth-url] Missing NEYNAR_API_KEY');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    console.log('[get-auth-url] Fetching authorization URL for client:', clientId);
    
    // Construct the URL with proper query parameters
    const url = new URL('https://api.neynar.com/v2/farcaster/login/authorize');
    url.searchParams.append('client_id', clientId);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('redirect_uri', 'https://schedule-cast.vercel.app/siwn-bridge');
    
    // Call Neynar's fetch authorization URL API
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-api-key': apiKey
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[get-auth-url] Neynar API error:', response.status, errorText);
      return NextResponse.json({ 
        error: 'Failed to fetch authorization URL',
        details: errorText 
      }, { status: response.status });
    }
    
    const data = await response.json();
    console.log('[get-auth-url] Success:', data);
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[get-auth-url] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch authorization URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 