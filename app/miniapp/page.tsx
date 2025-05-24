'use client';

import { useFrameContext } from '@/lib/frame-context';
import { useAuth } from '@/lib/auth-context';
import CompactCastForm from '@/components/CompactCastForm';
import CompactScheduledCasts from '@/components/CompactScheduledCasts';
import UniversalAuthButton from '@/components/UniversalAuthButton';

export default function MiniAppPage() {
  const { isFrameApp, frameContext, isLoading } = useFrameContext();
  const { isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading Schedule Cast...</p>
        </div>
      </div>
    );
  }

  // Apply safe area insets if available from frame context
  const safeAreaInsets = frameContext?.client?.safeAreaInsets || {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  };

  return (
    <div 
      className="min-h-screen bg-gray-900"
      style={{
        backgroundColor: '#111827 !important',
        color: '#ffffff !important',
        minHeight: '100vh',
        paddingTop: `${safeAreaInsets.top}px`,
        paddingBottom: `${safeAreaInsets.bottom}px`,
        paddingLeft: `${safeAreaInsets.left}px`,
        paddingRight: `${safeAreaInsets.right}px`,
      }}
    >
      {/* Header */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700 px-6 py-8" style={{ backgroundColor: '#1f2937 !important', borderColor: '#374151 !important' }}>
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 flex-shrink-0">
              <svg
                className="h-6 w-6 text-white flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                width="24"
                height="24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white">Schedule Cast</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8 w-full overflow-x-hidden flex justify-center">
        {isAuthenticated ? (
          <div className="space-y-8 max-w-sm w-full mx-auto">
            {frameContext?.user && (
              <div className="bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-700">
                <div className="flex items-center justify-between px-2">
                  <span className="text-base text-gray-300 font-medium">Signed in as</span>
                  <div className="flex items-center space-x-3">
                    {frameContext.user.pfpUrl && (
                      <div className="w-12 h-12 rounded-full border-2 border-gray-600 overflow-hidden flex-shrink-0">
                        <img
                          src={frameContext.user.pfpUrl}
                          alt={frameContext.user.displayName || frameContext.user.username || 'User'}
                          className="w-full h-full object-cover"
                          style={{ 
                            width: '48px !important', 
                            height: '48px !important',
                            maxWidth: '48px',
                            maxHeight: '48px',
                            minWidth: '48px',
                            minHeight: '48px'
                          }}
                        />
                      </div>
                    )}
                    <div className="text-right min-w-0">
                      <p className="font-medium text-white text-base truncate">
                        {frameContext.user.displayName || frameContext.user.username || `FID ${frameContext.user.fid}`}
                      </p>
                      <p className="text-xs text-gray-400 -mt-1">FID: {frameContext.user.fid}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <CompactCastForm />
            
            <CompactScheduledCasts />
          </div>
        ) : (
          <div className="text-center py-16 space-y-8 max-w-sm w-full mx-auto">
            {/* Show frame user info if available, even if not authenticated */}
            {frameContext?.user && (
              <div className="bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-700">
                <div className="flex items-center justify-between px-2">
                  <span className="text-base text-gray-300 font-medium">Continue as</span>
                  <div className="flex items-center space-x-3">
                    {frameContext.user.pfpUrl && (
                      <div className="w-12 h-12 rounded-full border-2 border-gray-600 overflow-hidden flex-shrink-0">
                        <img
                          src={frameContext.user.pfpUrl}
                          alt={frameContext.user.displayName || frameContext.user.username || 'User'}
                          className="w-full h-full object-cover"
                          style={{ 
                            width: '48px !important', 
                            height: '48px !important',
                            maxWidth: '48px',
                            maxHeight: '48px',
                            minWidth: '48px',
                            minHeight: '48px'
                          }}
                        />
                      </div>
                    )}
                    <div className="text-right min-w-0">
                      <p className="font-medium text-white text-base truncate">
                        {frameContext.user.displayName || frameContext.user.username || `FID ${frameContext.user.fid}`}
                      </p>
                      <p className="text-xs text-gray-400 -mt-1">FID: {frameContext.user.fid}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <div className="w-20 h-20 bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-8 border-2 border-purple-700">
                <svg
                  className="w-10 h-10 text-purple-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">
                {frameContext?.user ? 'Complete Setup' : 'Welcome to Schedule Cast'}
              </h2>
              <p className="text-gray-300 mb-8 max-w-md mx-auto text-lg leading-relaxed">
                {frameContext?.user 
                  ? 'Sign in to grant Schedule Cast permission to post on your behalf and save your scheduled casts.'
                  : 'Plan and schedule your Farcaster casts for optimal engagement. Sign in to get started.'
                }
              </p>
              <UniversalAuthButton className="inline-block" />
            </div>
          </div>
        )}
      </main>

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white text-xs p-3 rounded-lg max-w-xs">
          <p><strong>Frame App:</strong> {isFrameApp ? 'Yes' : 'No'}</p>
          <p><strong>Auth:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
          {frameContext && (
            <p><strong>Client FID:</strong> {frameContext.client?.clientFid}</p>
          )}
        </div>
      )}
    </div>
  );
} 