'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SupabaseStatus from '@/components/SupabaseStatus';
import NeynarSignInButton from '@/components/NeynarSignInButton';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  // If loading, show minimal content
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-4xl font-bold text-center mb-6">Schedule Cast</h1>
        <p className="text-center">Loading...</p>
      </div>
    );
  }
  
  // If already authenticated, don't show anything (will redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <h1 className="text-4xl font-bold text-center mb-6">Schedule Cast</h1>
      <p className="text-xl text-center mb-8">
        Schedule your Farcaster casts to be posted at a future time
      </p>
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <p className="text-center mb-4">
          Sign in with your Farcaster account to get started
        </p>
        <NeynarSignInButton theme="dark" className="w-full" />
        <SupabaseStatus />
      </div>
    </div>
  )
} 