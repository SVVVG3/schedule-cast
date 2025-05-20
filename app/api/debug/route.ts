import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import neynarClient from "@/lib/neynarClient";

// Debug endpoint for troubleshooting Supabase connection issues
export async function GET(request: Request) {
  try {
    // Check for Supabase URL and key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // Check for auth session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // Try to create a test user bypassing RLS
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    // Check environment variables
    const envVars = {
      NEYNAR_API_KEY: process.env.NEYNAR_API_KEY ? `Starts with: ${process.env.NEYNAR_API_KEY.substring(0, 5)}...` : "Missing",
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Missing",
      SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Missing",
      CRON_SECRET: process.env.CRON_SECRET ? "Set" : "Missing",
    };
    
    // Check if we can make a simple API call to Neynar
    const apiCheck: {
      status: string;
      error: string | null;
      response: any | null;
    } = {
      status: "Attempting...",
      error: null,
      response: null
    };
    
    try {
      // Try to get trending casts as a simple test
      const usersResponse = await fetch("https://api.neynar.com/v2/farcaster/feed/trending?limit=1", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "api_key": process.env.NEYNAR_API_KEY || ""
        }
      });
      
      if (usersResponse.ok) {
        apiCheck.status = "Success";
        apiCheck.response = await usersResponse.json();
      } else {
        apiCheck.status = "Failed";
        apiCheck.error = `Status ${usersResponse.status}: ${await usersResponse.text()}`;
      }
    } catch (e) {
      apiCheck.status = "Error";
      apiCheck.error = e instanceof Error ? e.message : String(e);
    }
    
    // Try to create a signer via SDK
    const signerCheck: {
      status: string;
      error: string | null;
      response: any | null;
    } = {
      status: "Attempting...",
      error: null,
      response: null
    };
    
    try {
      const signer = await neynarClient.createSigner();
      signerCheck.status = "Success";
      signerCheck.response = signer;
    } catch (e) {
      signerCheck.status = "Error";
      signerCheck.error = e instanceof Error ? e.message : String(e);
    }
    
    // Return all the debug information
    return NextResponse.json({
      environment: {
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseKey: !!supabaseKey,
        nodeEnv: process.env.NODE_ENV
      },
      auth: {
        hasSession: !!session,
        sessionError: sessionError ? sessionError.message : null,
      },
      database: {
        testData,
        testError: testError ? {
          message: testError.message,
          code: testError.code,
          details: testError.details,
          hint: testError.hint
        } : null
      },
      environmentVariables: envVars,
      neynarApiCheck: apiCheck,
      signerCreationCheck: signerCheck,
      sdk_version: require('@neynar/nodejs-sdk/package.json')?.version || "Unknown"
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ error: 'Debug API error', details: (error as Error).message }, { status: 500 });
  }
} 