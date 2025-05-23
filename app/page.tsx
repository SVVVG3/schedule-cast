'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import SupabaseStatus from '@/components/SupabaseStatus';
import NeynarSignInButton from '@/components/NeynarSignInButton';
import NeynarCallbackHandler from '@/components/NeynarCallbackHandler';
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
    <>
      {/* Handle Neynar callback */}
      <Suspense fallback={null}>
        <NeynarCallbackHandler />
      </Suspense>
      
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          {/* Modern Card with Gradient Border */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500 p-[1px] shadow-2xl">
            <div className="rounded-3xl bg-white p-8 text-center">
              {/* Logo */}
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600">
                <svg
                  className="h-8 w-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </div>

              {/* Header */}
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3">
                Schedule Cast
              </h1>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Schedule your Farcaster casts to be posted at the perfect time
              </p>

              {/* Features */}
              <div className="space-y-3 mb-8">
                <div className="flex items-center text-sm text-gray-700">
                  <svg className="h-4 w-4 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Schedule casts for any future date & time
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <svg className="h-4 w-4 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Post to channels or your main feed
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <svg className="h-4 w-4 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Track your scheduled & posted casts
                </div>
              </div>

              {/* Sign In Button */}
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Sign in with your Farcaster account to get started
                </p>
                <NeynarSignInButton theme="dark" className="w-full" />
              </div>

              {/* Status */}
              <div className="mt-6">
                <SupabaseStatus />
              </div>
            </div>
          </div>

          {/* Mobile-optimized footer note */}
          <p className="text-center text-xs text-gray-500 mt-6">
            A modern Farcaster mini app for scheduling casts
          </p>
        </div>
      </div>
    </>
  )
} 