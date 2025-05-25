'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CompactCastForm from '@/components/CompactCastForm';
import SimpleCastForm from '@/components/SimpleCastForm';
import ScheduledCasts from '@/components/ScheduledCasts';
import { useAuth } from '@/lib/auth-context';
import { useUser } from '@/lib/user-context';

export default function MiniApp() {
  const { isAuthenticated, isLoading: authLoading, user: authUser } = useAuth();
  const { isLoading: userLoading, supabaseUser } = useUser();
  const [isMiniAppReady, setIsMiniAppReady] = useState(false);

  useEffect(() => {
    // Initialize Farcaster Mini App SDK
    const initializeMiniApp = async () => {
      try {
        // Dynamically import the SDK to avoid SSR issues
        const { sdk } = await import('@farcaster/frame-sdk');
        
        // Let the host know the app is ready
        await sdk.actions.ready();
        setIsMiniAppReady(true);
        
        console.log('Mini App SDK initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Mini App SDK:', error);
        // Still show the app even if SDK fails
        setIsMiniAppReady(true);
      }
    };

    initializeMiniApp();
  }, []);

  if (authLoading || userLoading || !isMiniAppReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <p className="text-center text-gray-600">Loading Schedule Cast...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {isAuthenticated && supabaseUser ? (
        <div className="py-8 px-4">
          <div className="max-w-2xl mx-auto">
            {/* User Header */}
            <div className="flex items-center justify-center mb-4 bg-white rounded-lg p-4 shadow-sm">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center mr-3 flex-shrink-0">
                {authUser?.avatar ? (
                  <img 
                    src={authUser.avatar} 
                    alt={authUser.displayName || authUser.username || 'User'} 
                    className="w-10 h-10 rounded-full object-cover"
                    style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px', maxWidth: '40px', maxHeight: '40px' }}
                  />
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900 leading-none mb-0">
                  {authUser?.displayName || authUser?.username || 'User'}
                </p>
                {authUser?.username && authUser.displayName && (
                  <p className="text-sm text-gray-500 -mt-2">@{authUser.username}</p>
                )}
              </div>
            </div>

            {/* App Title */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center mb-2">
                <svg className="w-8 h-8 text-white mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h1 className="text-3xl font-bold text-white">
                  Schedule Cast
                </h1>
              </div>
            </div>

            {/* Cast Form */}
            <div className="mb-8">
              <SimpleCastForm />
            </div>

            {/* Scheduled Casts */}
            <ScheduledCasts />
          </div>
        </div>
      ) : (
        <div className="py-8 px-4">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Schedule Cast
              </h1>
              <p className="text-gray-600">
                Plan and schedule your Farcaster posts
              </p>
            </div>

            {/* Cast Form */}
            <CompactCastForm />

            {/* Features */}
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="bg-white rounded-lg p-4 shadow-sm text-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-sm mb-1">Perfect Timing</h3>
                <p className="text-xs text-gray-600">Schedule for any time</p>
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-sm text-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m0 0v10a2 2 0 002 2h8a2 2 0 002-2V8" />
                  </svg>
                </div>
                <h3 className="font-semibold text-sm mb-1">Channels</h3>
                <p className="text-xs text-gray-600">Post to any channel</p>
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-sm text-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-sm mb-1">Track</h3>
                <p className="text-xs text-gray-600">Monitor your casts</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 