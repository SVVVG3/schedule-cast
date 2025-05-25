import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import neynarClient from '@/lib/neynarClient';

/**
 * Test endpoint for Neynar API integration
 * This is for development/testing only and should be removed in production
 */
export async function POST(request: Request) {
  try {
    console.log('[test-neynar] Processing request');
    console.log('[test-neynar] Environment variables check:');
    console.log('[test-neynar] NEYNAR_API_KEY exists:', !!process.env.NEYNAR_API_KEY);
    
    // Parse request body
    const { fid, content, channel_id } = await request.json();
    console.log('[test-neynar] Request data:', { fid, content, hasChannelId: !!channel_id });
    
    // Validation
    if (!content) {
      return NextResponse.json(
        { error: 'Missing content parameter' },
        { status: 400 }
      );
    }
    
    if (!fid) {
      return NextResponse.json(
        { error: 'Missing fid parameter' },
        { status: 400 }
      );
    }
    
    try {
      // Get the user and their signer UUID from Supabase
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, signer_uuid, delegated')
        .eq('fid', fid)
        .maybeSingle();
      
      console.log('[test-neynar] User lookup result:', { user, error: userError });
      
      if (userError) {
        throw new Error(`Failed to fetch user: ${userError.message}`);
      }
      
      if (!user) {
        return NextResponse.json(
          { error: `No user found with FID: ${fid}` },
          { status: 404 }
        );
      }
      
      if (!user.signer_uuid) {
        return NextResponse.json(
          { 
            error: 'No signer found for this user. Please use Sign in with Neynar (SIWN) first.',
            action_required: 'connect_with_siwn'
          },
          { status: 400 }
        );
      }
      
      if (!user.delegated) {
        return NextResponse.json(
          { 
            error: 'Signer has not been delegated yet. Please connect with SIWN again.',
            action_required: 'connect_with_siwn'
          },
          { status: 400 }
        );
      }
      
      // Now use the signer to post a cast
      console.log('[test-neynar] Posting cast using signer UUID:', user.signer_uuid);
      
      // According to the Neynar documentation
      let apiEndpoint = 'https://api.neynar.com/v2/farcaster/cast';
      let requestBody: any = {
        signer_uuid: user.signer_uuid,
        text: content
      };
      
      // Add channel_id if provided
      if (channel_id) {
        requestBody.channel_id = channel_id;
      }
      
      console.log('[test-neynar] Making API request to:', apiEndpoint);
      console.log('[test-neynar] Request body:', requestBody);
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEYNAR_API_KEY || '' // Correct header name according to docs
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('[test-neynar] Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[test-neynar] Error response from Neynar API:', response.status, errorText);
        
        try {
          // Try to parse error as JSON if possible
          const errorJson = JSON.parse(errorText);
          return NextResponse.json(
            { 
              error: `Failed to post cast: ${errorJson.message || 'Unknown error'}`,
              status: response.status,
              details: errorJson
            },
            { status: 500 }
          );
        } catch (e) {
          // If not JSON, return as text
          return NextResponse.json(
            { 
              error: `Failed to post cast: ${errorText || response.statusText}`,
              status: response.status
            },
            { status: 500 }
          );
        }
      }
      
      const castData = await response.json();
      console.log('[test-neynar] Cast posted successfully:', castData);
      
      return NextResponse.json({
        success: true,
        message: 'Cast posted successfully',
        cast: castData
      });
    } catch (error) {
      console.error('[test-neynar] Error posting cast:', error);
      return NextResponse.json(
        { error: `Error posting cast: ${(error as Error).message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[test-neynar] Unexpected error:', error);
    return NextResponse.json(
      { error: `An unexpected error occurred: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 