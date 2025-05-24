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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      {/* Header */}
      <header className="w-full py-6 px-6 border-b border-gray-700 backdrop-blur-sm bg-gray-900/50">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          <h1 className="text-2xl font-bold text-white">Schedule Cast</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8 w-full overflow-x-hidden flex justify-center">
        {isAuthenticated ? (
          <div className="space-y-8 max-w-sm w-full mx-auto">
            {/* User Profile Section */}
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
                    <div className="flex flex-col space-y-0">
                      <span className="font-medium text-white text-sm">
                        {frameContext.user.displayName || frameContext.user.username || `FID ${frameContext.user.fid}`}
                      </span>
                      <span className="text-xs text-gray-400">FID {frameContext.user.fid}</span>
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
                    <div className="flex flex-col space-y-0">
                      <span className="font-medium text-white text-sm">
                        {frameContext.user.displayName || frameContext.user.username || `FID ${frameContext.user.fid}`}
                      </span>
                      <span className="text-xs text-gray-400">FID {frameContext.user.fid}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-700 text-center">
              <h2 className="text-xl font-semibold text-white mb-4">Welcome to Schedule Cast</h2>
              <p className="text-gray-300 mb-6 text-sm leading-relaxed">
                Connect your Farcaster account to start scheduling casts. You can schedule posts to go live at any time you choose.
              </p>
              
              <UniversalAuthButton />
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