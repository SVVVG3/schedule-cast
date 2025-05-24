'use client';

import { useFrameContext } from '@/lib/frame-context';
import { useAuth } from '@/lib/auth-context';
import CompactCastForm from '@/components/CompactCastForm';
import UniversalAuthButton from '@/components/UniversalAuthButton';

export default function MiniAppPage() {
  const { isFrameApp, frameContext, isLoading } = useFrameContext();
  const { isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
        <div className="text-center text-white">
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
      className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50"
      style={{
        paddingTop: `${safeAreaInsets.top}px`,
        paddingBottom: `${safeAreaInsets.bottom}px`,
        paddingLeft: `${safeAreaInsets.left}px`,
        paddingRight: `${safeAreaInsets.right}px`,
      }}
    >
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">SC</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Schedule Cast</h1>
              {isFrameApp && (
                <p className="text-xs text-gray-500">Farcaster Mini App</p>
              )}
            </div>
          </div>
          
          <UniversalAuthButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        {isAuthenticated ? (
          <div className="space-y-6">
            {frameContext?.user && (
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <h2 className="text-sm font-medium text-gray-700 mb-2">Signed in as</h2>
                <div className="flex items-center space-x-3">
                  {frameContext.user.pfpUrl && (
                    <img
                      src={frameContext.user.pfpUrl}
                      alt={frameContext.user.displayName || frameContext.user.username || 'User'}
                      className="w-10 h-10 rounded-full border border-gray-200"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {frameContext.user.displayName || frameContext.user.username || `FID ${frameContext.user.fid}`}
                    </p>
                    <p className="text-sm text-gray-500">FID: {frameContext.user.fid}</p>
                  </div>
                </div>
              </div>
            )}
            
            <CompactCastForm />
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-purple-600"
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
            <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome to Schedule Cast</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Plan and schedule your Farcaster casts for optimal engagement. 
              Sign in to get started.
            </p>
            <UniversalAuthButton className="inline-block" />
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