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
          Sign in with Farcaster to get posting permissions for scheduling casts.
        </p>
        <button
          onClick={async () => {
            try {
              console.log('[MiniAppAuth] Starting native Farcaster authentication...');
              
              // Import the Frame SDK
              const { sdk } = await import('@farcaster/frame-sdk');
              
              // Generate a secure nonce (you should get this from your server)
              const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
              
              // Use the native Frame SDK signIn action
              const result = await sdk.actions.signIn({
                nonce,
                acceptAuthAddress: true
              });
              
              console.log('[MiniAppAuth] Sign in successful:', result);
              
              // Send the SIWF message and signature to your server for verification
              const response = await fetch('/api/auth/verify-siwf', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  message: result.message,
                  signature: result.signature,
                  fid: frameContext.user.fid
                })
              });
              
              if (response.ok) {
                console.log('[MiniAppAuth] Authentication verification successful');
                // You might want to trigger a page refresh or update auth state here
                window.location.reload();
              } else {
                const error = await response.json();
                console.error('[MiniAppAuth] Authentication verification failed:', error);
                alert('Authentication verification failed. Please try again.');
              }
            } catch (error) {
              console.error('[MiniAppAuth] Authentication failed:', error);
              alert('Authentication failed. Please try again.');
            }
          }}
          className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center justify-center space-x-2"
        >
          <span>🔐</span>
          <span>Sign In with Farcaster</span>
        </button>
      </div>
    </div>
  );
} 