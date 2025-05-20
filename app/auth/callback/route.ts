import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  
  if (code) {
    try {
      // Exchange code for session
      await supabase.auth.exchangeCodeForSession(code);
      
      // Redirect to dashboard after successful authentication
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } catch (error) {
      console.error('Error in auth callback:', error);
      return NextResponse.redirect(new URL('/?error=auth_callback_error', request.url));
    }
  }
  
  // No code provided, redirect to home
  return NextResponse.redirect(new URL('/?error=no_code_provided', request.url));
} 