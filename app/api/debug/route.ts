import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Debug endpoint for troubleshooting Supabase connection issues
export async function GET() {
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
      }
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ error: 'Debug API error', details: (error as Error).message }, { status: 500 });
  }
} 