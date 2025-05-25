import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json();
    
    console.log('[store-neynar-user] Storing Neynar user data:', userData);
    
    if (!userData.fid) {
      return NextResponse.json({ 
        error: 'FID is required' 
      }, { status: 400 });
    }

    // Create Supabase client with service role key (same pattern as run-sql route)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Prepare user data for our database
    const dbUserData = {
      fid: userData.fid,
      username: userData.username || null,
      display_name: userData.display_name || userData.displayName || null,
      avatar: userData.pfp_url || userData.avatar || null,
      signer_uuid: userData.signer_uuid || null,
      delegated: !!userData.signer_uuid,
      updated_at: new Date().toISOString()
    };

    console.log('[store-neynar-user] Prepared database user data:', dbUserData);

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, fid')
      .eq('fid', userData.fid)
      .maybeSingle();

    if (fetchError) {
      console.error('[store-neynar-user] Error checking existing user:', fetchError);
      return NextResponse.json({ 
        error: 'Database error while checking user',
        details: fetchError 
      }, { status: 500 });
    }

    if (existingUser) {
      // Update existing user
      console.log('[store-neynar-user] Updating existing user:', existingUser.id);
      
      const { data, error } = await supabase
        .from('users')
        .update(dbUserData)
        .eq('id', existingUser.id)
        .select()
        .single();

      if (error) {
        console.error('[store-neynar-user] Error updating user:', error);
        return NextResponse.json({ 
          error: 'Failed to update user',
          details: error 
        }, { status: 500 });
      }

      console.log('[store-neynar-user] User updated successfully:', data.fid);
      return NextResponse.json({ 
        success: true, 
        message: 'User updated successfully',
        user: data 
      });
    } else {
      // Create new user
      console.log('[store-neynar-user] Creating new user for FID:', userData.fid);
      
      const newUserData = {
        ...dbUserData,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('users')
        .insert(newUserData)
        .select()
        .single();

      if (error) {
        console.error('[store-neynar-user] Error creating user:', error);
        return NextResponse.json({ 
          error: 'Failed to create user',
          details: error 
        }, { status: 500 });
      }

      console.log('[store-neynar-user] User created successfully:', data.fid);
      return NextResponse.json({ 
        success: true, 
        message: 'User created successfully',
        user: data 
      });
    }
  } catch (error) {
    console.error('[store-neynar-user] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 