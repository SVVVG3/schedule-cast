'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useFrameContext } from '@/lib/frame-context';
import NeynarSignInButton from './NeynarSignInButton';

interface SignerApprovalCheckerProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function SignerApprovalChecker({ children, fallback }: SignerApprovalCheckerProps) {
  const { user, isAuthenticated } = useAuth();
  const { isMiniApp } = useFrameContext();
  const [hasSigner, setHasSigner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user?.fid) {
      setIsLoading(false);
      return;
    }

    checkUserSigner();
  }, [isAuthenticated, user?.fid, user?.signer_uuid]);

  const checkUserSigner = async () => {
    if (!user?.fid) return;

    try {
      setIsLoading(true);

      // Check if user has a signer in our database
      const response = await fetch(`/api/debug-user?fid=${user?.fid}`);
      const data = await response.json();

      if (response.ok && data.has_signer && data.is_delegated) {
        setHasSigner(true);
      } else {
        setHasSigner(false);
      }
    } catch (err) {
      console.error('Error checking user signer:', err);
      setHasSigner(false);
    } finally {
      setIsLoading(false);
    }
  };

  // If not authenticated, show sign in option
  if (!isAuthenticated) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
          <h3 className="font-semibold mb-2">🔐 Sign In Required</h3>
          <p className="text-sm mb-3">
            Please sign in with your Farcaster account to schedule casts.
          </p>
          <NeynarSignInButton theme="light" />
        </div>
        {fallback || (
          <div className="opacity-50 pointer-events-none">
            {children}
          </div>
        )}
      </div>
    );
  }

  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          Checking account permissions...
        </div>
      </div>
    );
  }

  // If user doesn't have a signer, show SIWN to get posting permissions
  if (!hasSigner) {
    return (
      <div className="space-y-4">
        <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg">
          <h3 className="font-semibold mb-2">🔐 Signer Approval Required</h3>
          <p className="text-sm mb-3">
            Before you can schedule casts, you need to approve Schedule-Cast to post on your behalf. 
            This is a one-time security step required by Farcaster.
          </p>
          
          <div className="mb-3">
            <NeynarSignInButton 
              theme="light" 
              showAsSignerDelegation={true}
              frameUserFid={user?.fid}
            />
          </div>
          
          <button
            onClick={checkUserSigner}
            className="px-4 py-2 bg-white border border-orange-300 text-orange-800 rounded-lg hover:bg-orange-50 text-sm"
          >
            Check Status Again
          </button>
        </div>
        {fallback || (
          <div className="opacity-50 pointer-events-none">
            {children}
          </div>
        )}
      </div>
    );
  }

  // If user has a signer, show the children (main app)
  return <>{children}</>;
} 