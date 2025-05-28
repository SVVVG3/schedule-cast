import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';

interface NotificationFilters {
  exclude_fids?: number[];
  following_fid?: number;
  minimum_user_score?: number;
  near_location?: {
    latitude: number;
    longitude: number;
    radius?: number;
  };
}

interface NotificationRequest {
  target_fids?: number[];
  filters?: NotificationFilters;
  notification: {
    title: string;
    body: string;
    target_url: string;
  };
}

/**
 * Send notifications to mini app users
 * POST /api/notifications/send
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[notifications/send] Processing notification request');

    // Authenticate the request
    const authResult = await authenticateUser(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has admin privileges (optional - you might want to restrict this)
    // For now, any authenticated user can send notifications
    
    if (!process.env.NEYNAR_API_KEY) {
      console.error('[notifications/send] NEYNAR_API_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const body: NotificationRequest = await request.json();
    
    // Validate required fields
    if (!body.notification?.title || !body.notification?.body || !body.notification?.target_url) {
      return NextResponse.json(
        { error: 'Missing required notification fields (title, body, target_url)' },
        { status: 400 }
      );
    }

    console.log('[notifications/send] Sending notification:', {
      title: body.notification.title,
      target_fids: body.target_fids?.length || 'all users',
      filters: body.filters ? Object.keys(body.filters) : 'none'
    });

    // Prepare the request body for Neynar API
    const neynarRequest: any = {
      notification: body.notification
    };

    // Add target FIDs if specified
    if (body.target_fids && body.target_fids.length > 0) {
      neynarRequest.target_fids = body.target_fids;
    } else {
      // Target all users with notifications enabled for this app
      neynarRequest.target_fids = [];
    }

    // Add filters if specified
    if (body.filters) {
      neynarRequest.filters = body.filters;
    }

    // Send the notification via Neynar API
    const response = await fetch('https://api.neynar.com/v2/farcaster/frame/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NEYNAR_API_KEY,
        'x-neynar-experimental': 'true'
      },
      body: JSON.stringify(neynarRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[notifications/send] Neynar API error:', errorText);
      
      return NextResponse.json(
        { 
          error: 'Failed to send notification',
          details: errorText
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('[notifications/send] Notification sent successfully:', result);

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      data: result
    });

  } catch (error: any) {
    console.error('[notifications/send] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send notification',
        message: error.message 
      },
      { status: 500 }
    );
  }
} 