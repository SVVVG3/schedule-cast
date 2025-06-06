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
  const [urlCopied, setUrlCopied] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  const copyUrlToClipboard = async () => {
    try {
      await navigator.clipboard.writeText('https://schedule-cast.vercel.app');
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000); // Hide after 2 seconds
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

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
    <div className="min-h-screen bg-gray-900 w-full max-w-full overflow-x-hidden">
      {isAuthenticated && supabaseUser ? (
        <div className="py-8 px-4 w-full max-w-full">
          <div className="max-w-2xl mx-auto w-full">
            {/* Mini App Title - Small Triangle with Much More Spacing */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-6">
                <svg 
                  className="text-white mr-8" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  width="40"
                  height="40"
                  style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px', maxWidth: '40px', maxHeight: '40px' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <h1 className="text-xl font-bold text-white">
                  Schedule Cast
                </h1>
              </div>
            </div>

            {/* User Header - Tighter Spacing */}
            <div style={{ marginBottom: '1rem' }}>
              <div 
                className="flex items-center justify-center"
                style={{ 
                  padding: '0.375rem 1rem',
                  gap: '0.375rem'
                }}
              >
                <span 
                  className="text-white font-medium"
                  style={{ fontSize: '16px', marginRight: '0.5rem' }}
                >
                  Signed in as:
                </span>
                <div 
                  className="rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md"
                  style={{ 
                    width: '64px', 
                    height: '64px',
                    marginRight: '0.375rem'
                  }}
                >
                  {authUser?.avatar ? (
                    <img 
                      src={authUser.avatar} 
                      alt={authUser.displayName || authUser.username || 'User'} 
                      className="rounded-full object-cover"
                      style={{ width: '64px', height: '64px' }}
                    />
                  ) : (
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <p 
                  className="font-semibold text-white"
                  style={{ fontSize: '18px' }}
                >
                  @{authUser?.username || 'user'}
                </p>
              </div>
            </div>

            {/* Cast Form */}
            <div className="mb-8">
              <SimpleCastForm 
                onCastScheduled={() => setRefreshTrigger(prev => prev + 1)}
              />
            </div>

            {/* Scheduled Casts */}
            <ScheduledCasts refreshTrigger={refreshTrigger} />
          </div>
        </div>
      ) : (
        <div className="py-8 px-4 w-full max-w-full">
          <div className="max-w-2xl mx-auto w-full">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-6">
                <svg 
                  className="text-white mr-3" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  width="32"
                  height="32"
                  style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <h1 className="text-2xl font-bold text-white">
                  Schedule Cast
                </h1>
              </div>
              <div className="px-4 space-y-4">
                {/* Step 1 Card */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-white font-semibold text-lg mb-3">1) Visit our website</h3>
                  <p className="text-gray-300 text-sm mb-4">Open the desktop/mobile site to grant permissions. You only need to do this the first time signing into our app - after that it's automatic!</p>
                  <div className="flex justify-center">
                    <button
                      onClick={copyUrlToClipboard}
                      className="inline-flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                      </svg>
                      <span>Copy Website URL By Tapping</span>
                    </button>
                  </div>
                  {urlCopied && (
                    <div className="mt-2 text-center">
                      <span className="text-green-400 text-sm font-medium">✓ Copied to clipboard!</span>
                    </div>
                  )}
                </div>

                {/* Step 2 Card */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-white font-semibold text-lg mb-3">2) Grant permissions</h3>
                  <p className="text-gray-300 text-sm">Click the <span className="text-purple-400 font-semibold">"Sign in with Neynar"</span> button to give us permission to post your casts at scheduled times.</p>
                </div>

                {/* Step 3 Card */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-white font-semibold text-lg mb-3">3) Return & start scheduling</h3>
                  <p className="text-gray-300 text-sm">Come back to the mini app after granting permissions. You'll be automatically signed in and ready to schedule casts! <span className="text-purple-400">Refresh in the top right corner if needed.</span></p>
                </div>
              </div>
            </div>

            {/* Cast Form */}
            <CompactCastForm />
          </div>
        </div>
      )}
    </div>
  );
} 