import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client with service role key
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

    const results: Record<string, any> = {};

    // Check users table
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    results['users'] = {
      data: usersData,
      error: usersError,
      count: usersData?.length || 0
    };

    // Check user_signers table  
    const { data: userSignersData, error: userSignersError } = await supabase
      .from('user_signers')
      .select('*')
      .limit(5);
    
    results['user_signers'] = {
      data: userSignersData,
      error: userSignersError,
      count: userSignersData?.length || 0
    };

    // Check managed_signers table
    const { data: managedSignersData, error: managedSignersError } = await supabase
      .from('managed_signers')
      .select('*')
      .limit(5);
    
    results['managed_signers'] = {
      data: managedSignersData,
      error: managedSignersError,
      count: managedSignersData?.length || 0
    };

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Error querying tables:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 