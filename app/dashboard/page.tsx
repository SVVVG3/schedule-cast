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

  // Debug logging
  console.log('[Dashboard] Auth state:', {
    isAuthenticated,
    authLoading,
    userLoading,
    authUser,
    supabaseUser
  });

  // Redirect to homepage if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log('[Dashboard] Redirecting to home - not authenticated');
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || userLoading) {
    console.log('[Dashboard] Showing loading state');
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('[Dashboard] Not authenticated, returning null');
    return null; // We'll redirect in the useEffect
  }

  console.log('[Dashboard] Rendering main dashboard');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600">Schedule and manage your Farcaster casts</p>
          
          {/* Debug info */}
          <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-left">
            <p><strong>Auth User:</strong> {authUser?.username || authUser?.fid || 'None'}</p>
            <p><strong>Supabase User:</strong> {supabaseUser?.username || 'None'}</p>
            <p><strong>Loading states:</strong> auth={authLoading.toString()}, user={userLoading.toString()}</p>
          </div>
        </div>
        
        {supabaseUser ? (
          <div className="space-y-8">
            {/* Cast Form */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Create New Cast</h2>
              <SimpleCastForm />
            </div>
            
            {/* Scheduled Casts */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Your Scheduled Casts</h2>
              <ScheduledCasts />
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-lg">
            <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-6">
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
                  <h3 className="text-sm font-medium text-yellow-800">Profile Loading</h3>
                  <p className="text-sm text-yellow-700">
                    Unable to load your user profile. Please try refreshing the page.
                  </p>
                  <p className="text-xs text-yellow-600 mt-2">
                    Auth user: {authUser?.username || 'None'} | Supabase user: {supabaseUser?.username || 'None'}
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