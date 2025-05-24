'use client';

import { useState } from 'react';
import { useFrameContext } from '@/lib/frame-context';

interface MiniAppAuthProps {
  className?: string;
}

export default function MiniAppAuth({ className = '' }: MiniAppAuthProps) {
  const { frameContext, isMiniApp } = useFrameContext();
  const [isCreatingSigner, setIsCreatingSigner] = useState(false);

  const handleCreateSigner = async () => {
    if (!frameContext?.user?.fid) {
      console.error('No user FID available');
      return;
    }

    try {
      setIsCreatingSigner(true);
      console.log('[MiniAppAuth] Creating signer for FID:', frameContext.user.fid);

      // Call our API to create a managed signer for this user
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

      if (response.ok) {
        const result = await response.json();
        console.log('[MiniAppAuth] Signer creation result:', result);
        
        if (result.signer_approval_url) {
          // Open the approval URL in the Farcaster client
          window.open(result.signer_approval_url, '_blank');
          
          // Show success message
          alert('🎉 Please approve the signer request that just opened, then return to the app!');
          
          // Refresh the page after a delay to check for approved signer
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          alert('✅ Signer already approved! You can now schedule casts.');
          window.location.reload();
        }
      } else {
        const error = await response.text();
        console.error('[MiniAppAuth] Signer creation failed:', error);
        alert('Failed to create signer. Please try again.');
      }
    } catch (error) {
      console.error('[MiniAppAuth] Error creating signer:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsCreatingSigner(false);
    }
  };

  if (!isMiniApp || !frameContext?.user) {
    return null;
  }

  return (
    <div className={`flex flex-col space-y-3 ${className}`}>
      <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-4">
        <div className="flex items-center space-x-3 mb-3">
          {frameContext.user.pfpUrl && (
            <img
              src={frameContext.user.pfpUrl}
              alt={frameContext.user.displayName || frameContext.user.username || 'User'}
              className="w-10 h-10 rounded-full border border-gray-600"
            />
          )}
          <div>
            <h3 className="text-white font-medium">
              Welcome, {frameContext.user.displayName || frameContext.user.username || `User ${frameContext.user.fid}`}!
            </h3>
            <p className="text-blue-200 text-sm">FID {frameContext.user.fid}</p>
          </div>
        </div>
        
        <p className="text-blue-200 text-sm mb-3">
          To schedule casts on your behalf, we need to create a secure signer for your account.
        </p>
        
        <button
          onClick={handleCreateSigner}
          disabled={isCreatingSigner}
          className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors duration-200 ${
            isCreatingSigner
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          {isCreatingSigner ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Creating Signer...</span>
            </>
          ) : (
            <span>Grant Posting Permissions</span>
          )}
        </button>
      </div>
    </div>
  );
} 