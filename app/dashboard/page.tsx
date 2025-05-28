'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/user-context';
import { useAuth } from '@/lib/auth-context';
import SimpleCastForm from '@/components/SimpleCastForm';
import ScheduledCasts from '@/components/ScheduledCasts';
import NotificationAdmin from '@/components/NotificationAdmin';

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading, user: authUser } = useAuth();
  const { isLoading: userLoading, supabaseUser } = useUser();
  const router = useRouter();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
      <div className="mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center space-x-4 mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 flex-shrink-0">
              <svg
                className="h-7 w-7 text-white flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                width="28"
                height="28"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white">
              Schedule Cast
            </h1>
          </div>
          
          {/* User Info - Matching Mini App Spacing */}
          {authUser && (
            <div className="mt-6">
              <div 
                className="flex items-center justify-center"
                style={{ 
                  padding: '0.375rem 1rem',
                  gap: '0.375rem'
                }}
              >
                <span 
                  className="text-gray-300 font-medium"
                  style={{ fontSize: '16px', marginRight: '0.5rem' }}
                >
                  Signed in as:
                </span>
                <div 
                  className="rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md"
                  style={{ 
                    width: '48px', 
                    height: '48px',
                    marginRight: '0.375rem'
                  }}
                >
                  {authUser.avatar ? (
                    <img 
                      src={authUser.avatar} 
                      alt={authUser.displayName || authUser.username || 'User'} 
                      className="rounded-full object-cover"
                      style={{ width: '48px', height: '48px' }}
                    />
                  ) : (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <p 
                  className="font-semibold text-white"
                  style={{ fontSize: '18px' }}
                >
                  @{authUser.username || 'user'}
                </p>
              </div>
            </div>
          )}
        </div>
        
        {supabaseUser ? (
          <div className="space-y-12 w-full">
            {/* Cast Form - Remove padding constraints */}
            <div className="w-full -mx-4">
              <SimpleCastForm 
                onCastScheduled={() => setRefreshTrigger(prev => prev + 1)}
              />
            </div>
            
            {/* Notification Admin */}
            <div className="w-full max-w-2xl mx-auto">
              <NotificationAdmin />
            </div>
            
            {/* Scheduled Casts */}
            <div className="w-full">
              <ScheduledCasts refreshTrigger={refreshTrigger} />
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