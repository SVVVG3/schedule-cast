'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/user-context';
import { useAuth } from '@/lib/auth-context';
import SimpleCastForm from '@/components/SimpleCastForm';
import ScheduledCasts from '@/components/ScheduledCasts';

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading, user: authUser } = useAuth();
  const { isLoading: userLoading, supabaseUser } = useUser();
  const router = useRouter();

  // Note: Authentication working properly

  // Redirect to homepage if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || userLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-lg text-gray-300">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // We'll redirect in the useEffect
  }

  return (
    <div className="min-h-screen bg-gray-900" style={{ backgroundColor: '#111827 !important', color: '#ffffff !important', minHeight: '100vh' }}>
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent mb-3">
            Dashboard
          </h1>
          <p className="text-gray-300 text-lg">Schedule and manage your Farcaster casts</p>
        </div>
        
        {supabaseUser ? (
          <div className="space-y-12 w-full">
            {/* Cast Form - Removed redundant heading */}
            <div className="w-full flex justify-center">
              <SimpleCastForm />
            </div>
            
            {/* Scheduled Casts */}
            <div className="w-full">
              <ScheduledCasts />
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-lg">
            <div className="rounded-2xl bg-yellow-900 border border-yellow-700 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-yellow-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-200">Profile Loading</h3>
                  <p className="text-sm text-yellow-300">
                    Unable to load your user profile. Please try refreshing the page.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 