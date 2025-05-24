'use client';

import { useState } from 'react';
import { useFrameContext } from '@/lib/frame-context';
import NeynarSignInButton from './NeynarSignInButton';

interface MiniAppAuthProps {
  className?: string;
}

export default function MiniAppAuth({ className = '' }: MiniAppAuthProps) {
  const { frameContext, isMiniApp } = useFrameContext();
  const [isChecking, setIsChecking] = useState(false);
  const [needsSIWN, setNeedsSIWN] = useState(false);

  const handleCheckSigner = async () => {
    if (!frameContext?.user?.fid) {
      console.error('No user FID available');
      return;
    }

    try {
      setIsChecking(true);
      console.log('[MiniAppAuth] Checking signer status for FID:', frameContext.user.fid);

      // Call our API to check if user needs SIWN
      const response = await fetch('/api/mini-app-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fid: frameContext.user.fid,
          username: frameContext.user.username,
          displayName: frameContext.user.displayName,
          pfpUrl: frameContext.user.pfpUrl,
        }),
      });

      const result = await response.json();
      console.log('[MiniAppAuth] API Response:', result);

      if (result.success) {
        // User already has signer
        alert('✅ You already have posting permissions! You can now schedule casts.');
        window.location.reload();
      } else if (result.needsSIWN) {
        // User needs to complete SIWN
        setNeedsSIWN(true);
      } else {
        console.error('[MiniAppAuth] Unexpected response:', result);
        alert(`Error: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[MiniAppAuth] Error checking signer:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  if (!isMiniApp || !frameContext?.user) {
    return null;
  }

  return (
    <div className={`flex flex-col space-y-3 ${className}`}>
      <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-4">
        <p className="text-blue-200 text-sm mb-3">
          To schedule casts on your behalf, we need to verify your posting permissions.
        </p>
        
        {!needsSIWN ? (
          <button
            onClick={handleCheckSigner}
            disabled={isChecking}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors duration-200 ${
              isChecking
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {isChecking ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Checking...</span>
              </>
            ) : (
              <span>Grant Posting Permissions</span>
            )}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-yellow-200 text-sm">
              Please complete authentication to get posting permissions:
            </p>
            <NeynarSignInButton 
              theme="dark"
              className="w-full"
              frameUserFid={frameContext.user.fid}
            />
          </div>
        )}
      </div>
    </div>
  );
} 