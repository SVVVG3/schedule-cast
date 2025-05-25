'use client';

import { useFrameContext } from '@/lib/frame-context';

interface MiniAppAuthProps {
  className?: string;
}

export default function MiniAppAuth({ className = '' }: MiniAppAuthProps) {
  const { frameContext, isMiniApp } = useFrameContext();

  if (!isMiniApp || !frameContext?.user) {
    return null;
  }

  return (
    <div className={`flex flex-col space-y-3 ${className}`}>
      <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-4">
        <p className="text-blue-200 text-sm mb-3">
          Sign in with Neynar to get posting permissions for scheduling casts.
        </p>
        <button
          onClick={async () => {
            try {
              // Use API to get proper authorization URL
              const response = await fetch('/api/auth/get-auth-url');
              const data = await response.json();
              
              if (response.ok && data.authorization_url) {
                console.log('[MiniAppAuth] Got authorization URL:', data.authorization_url);
                // Navigate to the proper SIWN URL
                window.location.href = data.authorization_url;
              } else {
                console.error('[MiniAppAuth] Failed to get auth URL:', data);
                alert('Failed to initialize authentication. Please try again.');
              }
            } catch (error) {
              console.error('[MiniAppAuth] Error getting auth URL:', error);
              alert('Failed to initialize authentication. Please try again.');
            }
          }}
          className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center justify-center space-x-2"
        >
          <span>🔐</span>
          <span>Continue with Neynar</span>
        </button>
      </div>
    </div>
  );
} 