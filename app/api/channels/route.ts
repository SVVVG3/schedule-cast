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
    const authResult = await authenticateUser(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
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
      if (type === 'active') {
        // Fetch channels user has been active in
        const response = await neynarClient.fetchUsersActiveChannels({ fid: parseInt(fid), limit });
        channels = response.channels || [];
      } else {
        // Fetch channels user follows (default)
        const response = await neynarClient.fetchUserChannels({ fid: parseInt(fid), limit });
        channels = response.channels || [];
      }

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
      console.error('[channels] Neynar API error:', neynarError);
      
      // Handle specific Neynar API errors
      if (neynarError.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      
      if (neynarError.status === 404) {
        return NextResponse.json(
          { error: 'User not found or has no channels' },
          { status: 404 }
        );
      }

      throw neynarError;
    }

  } catch (error) {
    console.error('[channels] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch channels',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
} 