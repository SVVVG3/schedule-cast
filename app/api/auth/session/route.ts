import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Supabase session error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Return the session data (will be empty if no user is logged in)
    return NextResponse.json({ session: data.session });
  } catch (err) {
    console.error('Error fetching Supabase session:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 