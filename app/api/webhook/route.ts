import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 Webhook received from Farcaster client');
    
    // Get the raw body for signature verification
    const body = await request.text();
    
    // Log headers for debugging
    console.log('📋 Webhook headers:', {
      'content-type': request.headers.get('content-type'),
      'user-agent': request.headers.get('user-agent'),
      'x-forwarded-for': request.headers.get('x-forwarded-for'),
    });

    // Parse the webhook payload
    let payload;
    try {
      payload = JSON.parse(body);
      console.log('📦 Webhook payload:', JSON.stringify(payload, null, 2));
    } catch (parseError) {
      console.error('❌ Failed to parse webhook body:', parseError);
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Extract event type from payload
    const eventType = payload.event;
    if (!eventType) {
      console.error('❌ No event type found in payload');
      return NextResponse.json({ error: 'No event type specified' }, { status: 400 });
    }

    console.log(`🎯 Processing event: ${eventType}`);

    // Handle different event types
    switch (eventType) {
      case 'frame_added':
        console.log('✅ User added mini app to their Farcaster client');
        if (payload.notificationDetails) {
          console.log('🔔 Notifications enabled with details:', payload.notificationDetails);
          // With Neynar managed service, we don't need to store tokens
          // Neynar handles token management automatically
        }
        break;

      case 'frame_removed':
        console.log('🗑️ User removed mini app from their Farcaster client');
        // With Neynar managed service, tokens are automatically invalidated
        break;

      case 'notifications_enabled':
        console.log('🔔 User enabled notifications');
        if (payload.notificationDetails) {
          console.log('📋 New notification details:', payload.notificationDetails);
        }
        break;

      case 'notifications_disabled':
        console.log('🔕 User disabled notifications');
        // With Neynar managed service, tokens are automatically invalidated
        break;

      default:
        console.log(`❓ Unknown event type: ${eventType}`);
        break;
    }

    // Log success
    console.log(`✅ Successfully processed ${eventType} event`);

    // Return success response
    return NextResponse.json({ 
      success: true, 
      message: `Event ${eventType} processed successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Webhook processing error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle GET requests for testing
export async function GET() {
  return NextResponse.json({ 
    message: 'Schedule Cast webhook endpoint',
    timestamp: new Date().toISOString(),
    status: 'active'
  });
} 