import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

// Helper to authenticate using SIWN
async function authenticateUser(req: Request) {
  try {
    // First try to get auth data from the Authorization header
    const authHeader = req.headers.get('Authorization');
    
    // If we have a Bearer token
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        // For now, we'll assume the token is just the FID
        // In a production app, you'd use a proper JWT or other token
        const fid = parseInt(token, 10);
        
        if (isNaN(fid)) {
          return { authenticated: false, error: 'Invalid token format' };
        }
        
        // Get user data from Supabase
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('fid', fid)
          .maybeSingle();
          
        if (userError || !userData) {
          return { authenticated: false, error: 'User not found' };
        }
        
        return { 
          authenticated: true, 
          user: {
            id: userData.id,
            fid: userData.fid,
            username: userData.username,
            display_name: userData.display_name,
            signer_uuid: userData.signer_uuid
          }
        };
      } catch (error) {
        console.error('Error processing Bearer token:', error);
        return { authenticated: false, error: 'Authentication token error' };
      }
    }
    
    // If no Authorization header, check for FID in query parameters
    // This is a fallback for API routes where cookies might not be accessible
    const url = new URL(req.url);
    const fidParam = url.searchParams.get('fid');
    
    if (fidParam) {
      try {
        const fid = parseInt(fidParam, 10);
        
        if (isNaN(fid)) {
          return { authenticated: false, error: 'Invalid FID format' };
        }
        
        // Get user data from Supabase
        console.log(`[API] Fetching user with FID: ${fid}, type: ${typeof fid}`);
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('fid', fid)
          .maybeSingle();
          
        if (userError) {
          console.error('[API] Error fetching user by FID:', userError);
          return { authenticated: false, error: 'Error finding user' };
        }
        
        if (!userData) {
          console.log('[API] No user found with FID:', fid);
          return { authenticated: false, error: 'User not found' };
        }
        
        return { 
          authenticated: true, 
          user: {
            id: userData.id,
            fid: userData.fid,
            username: userData.username,
            display_name: userData.display_name,
            signer_uuid: userData.signer_uuid
          }
        };
      } catch (error) {
        console.error('Error processing FID param:', error);
        return { authenticated: false, error: 'Authentication parameter error' };
      }
    }
    
    // As a last resort, look for auth state in localStorage in client components
    // For server components, this won't work but it's handled by the error case
    return { authenticated: false, error: 'No authentication credentials found' };
  } catch (error) {
    console.error('Error authenticating user:', error);
    return { authenticated: false, error: 'Authentication error' };
  }
}

// POST /api/casts - Create a new scheduled cast
export async function POST(request: Request) {
  try {
    // Authenticate user with SIWN
    const authResult = await authenticateUser(request);
    
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user;
    
    // Parse request body
    const { content, scheduled_at, channel_id, media_urls, media_types, media_metadata } = await request.json();
    
    // Validate required fields
    if (!content || !scheduled_at) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate media arrays if provided
    if (media_urls && (!Array.isArray(media_urls) || media_urls.length > 4)) {
      return NextResponse.json(
        { error: 'media_urls must be an array with maximum 4 items' },
        { status: 400 }
      );
    }
    
    if (media_types && (!Array.isArray(media_types) || media_types.length !== media_urls?.length)) {
      return NextResponse.json(
        { error: 'media_types must match media_urls length' },
        { status: 400 }
      );
    }
    
    // Validate scheduled time is in the future
    const scheduledDate = new Date(scheduled_at);
    const now = new Date();
    
    if (scheduledDate <= now) {
      return NextResponse.json(
        { error: 'Scheduled time must be in the future' },
        { status: 400 }
      );
    }
    
    // Prepare cast data for database
    const castData: any = {
      user_id: user.id,
      content,
      scheduled_at,
      channel_id,
      fid: user.fid,
      has_media: !!(media_urls && media_urls.length > 0)
    };

    // Add media fields if provided
    if (media_urls && media_urls.length > 0) {
      castData.media_urls = media_urls;
      castData.media_types = media_types || [];
      castData.media_metadata = media_metadata || {};
      console.log('[casts] Cast includes media:', {
        count: media_urls.length,
        types: media_types
      });
    }

    // Insert into database
    // NOTE: We don't store signer_uuid here because SIWN signers need approval after creation
    // The cron job will look up the user's current approved signer when posting
    const { data, error } = await supabase
      .from('scheduled_casts')
      .insert(castData)
      .select()
      .single();
    
    if (error) {
      console.error('Error inserting cast:', error);
      return NextResponse.json(
        { error: 'Failed to schedule cast: ' + error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Unexpected error scheduling cast:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// GET /api/casts - Get all scheduled casts for the current user
export async function GET(request: Request) {
  try {
    // Authenticate user with SIWN
    const authResult = await authenticateUser(request);
    
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user;
    
    // Query for user's scheduled casts
    const { data, error } = await supabase
      .from('scheduled_casts')
      .select('*')
      .eq('user_id', user.id)
      .order('scheduled_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching casts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch scheduled casts' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error fetching casts:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 