import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper to authenticate using SIWN (same as main casts route)
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
    const url = new URL(req.url);
    const fidParam = url.searchParams.get('fid');
    
    if (fidParam) {
      try {
        const fid = parseInt(fidParam, 10);
        
        if (isNaN(fid)) {
          return { authenticated: false, error: 'Invalid FID format' };
        }
        
        // Get user data from Supabase
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
    
    return { authenticated: false, error: 'No authentication credentials found' };
  } catch (error) {
    console.error('Error authenticating user:', error);
    return { authenticated: false, error: 'Authentication error' };
  }
}

// PUT /api/casts/[id] - Update a scheduled cast
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Authenticate user
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
    if (media_urls && (!Array.isArray(media_urls) || media_urls.length > 2)) {
      return NextResponse.json(
        { error: 'media_urls must be an array with maximum 2 items (Farcaster limitation)' },
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
    
    // First, check if the cast exists and belongs to the user
    const { data: existingCast, error: fetchError } = await supabase
      .from('scheduled_casts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (fetchError) {
      console.error('Error fetching cast:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch cast' },
        { status: 500 }
      );
    }
    
    if (!existingCast) {
      return NextResponse.json(
        { error: 'Cast not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Check if cast has already been posted
    if (existingCast.posted) {
      return NextResponse.json(
        { error: 'Cannot edit a cast that has already been posted' },
        { status: 400 }
      );
    }
    
    // Prepare updated cast data
    const updateData: any = {
      content,
      scheduled_at,
      channel_id,
      has_media: !!(media_urls && media_urls.length > 0),
      updated_at: new Date().toISOString()
    };

    // Add media fields if provided
    if (media_urls && media_urls.length > 0) {
      updateData.media_urls = media_urls;
      updateData.media_types = media_types || [];
      updateData.media_metadata = media_metadata || {};
    } else {
      // Clear media fields if no media provided
      updateData.media_urls = null;
      updateData.media_types = null;
      updateData.media_metadata = null;
    }

    // Update the cast
    const { data, error } = await supabase
      .from('scheduled_casts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating cast:', error);
      return NextResponse.json(
        { error: 'Failed to update cast: ' + error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Unexpected error updating cast:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE /api/casts/[id] - Delete a scheduled cast
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Authenticate user
    const authResult = await authenticateUser(request);
    
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user;
    
    // First, check if the cast exists and belongs to the user
    const { data: existingCast, error: fetchError } = await supabase
      .from('scheduled_casts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (fetchError) {
      console.error('Error fetching cast:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch cast' },
        { status: 500 }
      );
    }
    
    if (!existingCast) {
      return NextResponse.json(
        { error: 'Cast not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Check if cast has already been posted
    if (existingCast.posted) {
      return NextResponse.json(
        { error: 'Cannot delete a cast that has already been posted' },
        { status: 400 }
      );
    }
    
    // Delete the cast
    const { error } = await supabase
      .from('scheduled_casts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error deleting cast:', error);
      return NextResponse.json(
        { error: 'Failed to delete cast: ' + error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Cast deleted successfully'
    });
  } catch (error) {
    console.error('Unexpected error deleting cast:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 