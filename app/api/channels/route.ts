import { NextResponse } from 'next/server';
import neynarClient from '@/lib/neynarClient';
import { authenticateUser } from '@/lib/auth';

/**
 * GET /api/channels - Fetch channels for a user
 * 
 * Query parameters:
 * - fid: User's Farcaster ID (required)
 * - limit: Maximum number of channels to return (optional, default: 25)
 * - type: 'followed' (channels user follows) or 'active' (channels user has posted in) - default: 'followed'
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const fid = url.searchParams.get('fid');
    const limit = parseInt(url.searchParams.get('limit') || '25');
    const type = url.searchParams.get('type') || 'followed';

    // Validate required parameters
    if (!fid) {
      return NextResponse.json(
        { error: 'FID parameter is required' },
        { status: 400 }
      );
    }

    // Authenticate user (ensure they can only fetch their own channels)
    console.log(`[channels] Authenticating user for FID: ${fid}`);
    const authResult = await authenticateUser(request);
    console.log(`[channels] Auth result:`, { 
      authenticated: authResult.authenticated, 
      userFid: authResult.user?.fid,
      error: authResult.error 
    });
    
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: authResult.error },
        { status: 401 }
      );
    }

    // Ensure user can only fetch their own channels
    if (authResult.user.fid !== parseInt(fid)) {
      return NextResponse.json(
        { error: 'You can only fetch your own channels' },
        { status: 403 }
      );
    }

    console.log(`[channels] Fetching ${type} channels for FID: ${fid}, limit: ${limit}`);

    let channels;
    
    try {
      // Use direct fetch instead of SDK to avoid the 'in' operator issue
      const apiKey = process.env.NEYNAR_API_KEY;
      if (!apiKey) {
        throw new Error('NEYNAR_API_KEY not configured');
      }

      let apiUrl;
      if (type === 'active') {
        // Fetch channels user has been active in
        apiUrl = `https://api.neynar.com/v2/farcaster/user/channels?fid=${fid}&limit=${limit}`;
      } else {
        // Fetch channels user follows (default)
        apiUrl = `https://api.neynar.com/v2/farcaster/user/channels?fid=${fid}&limit=${limit}`;
      }

      console.log(`[channels] Making direct API call to: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'api_key': apiKey
        }
      });

      console.log(`[channels] API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`[channels] API error response: ${errorText}`);
        throw new Error(`Neynar API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      channels = data.channels || [];

      console.log(`[channels] Found ${channels.length} ${type} channels for FID: ${fid}`);

      // Format channels for frontend consumption
      const formattedChannels = channels.map((channel: any) => ({
        id: channel.id,
        name: channel.name,
        description: channel.description,
        image_url: channel.image_url,
        follower_count: channel.follower_count,
        url: channel.url,
        parent_url: channel.parent_url,
        lead: channel.lead
      }));

      return NextResponse.json({
        success: true,
        channels: formattedChannels,
        count: formattedChannels.length,
        type,
        fid: parseInt(fid)
      });

    } catch (neynarError: any) {
      console.error('[channels] Neynar API error details:', {
        error: neynarError,
        message: neynarError?.message,
        status: neynarError?.status,
        response: neynarError?.response,
        type: typeof neynarError
      });
      
      // Handle different types of errors more carefully
      if (typeof neynarError === 'string') {
        return NextResponse.json(
          { error: 'API error', details: neynarError },
          { status: 500 }
        );
      }
      
      // Handle specific Neynar API errors
      if (neynarError?.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      
      if (neynarError?.status === 404) {
        return NextResponse.json(
          { error: 'User not found or has no channels' },
          { status: 404 }
        );
      }

      // Return a safe error response
      return NextResponse.json(
        { 
          error: 'Failed to fetch channels from Neynar API',
          details: neynarError?.message || 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[channels] Unexpected error:', {
      error,
      type: typeof error,
      message: typeof error === 'object' && error !== null && 'message' in error ? (error as Error).message : String(error)
    });
    
    const errorMessage = typeof error === 'string' 
      ? error 
      : typeof error === 'object' && error !== null && 'message' in error 
        ? (error as Error).message 
        : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch channels',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
} 