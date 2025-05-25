'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useFrameContext } from '@/lib/frame-context';
import NeynarSignInButton from './NeynarSignInButton';

interface SignerStatus {
  status: string;
  needs_approval: boolean;
  approval_url?: string;
}

interface SignerApprovalCheckerProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function SignerApprovalChecker({ children, fallback }: SignerApprovalCheckerProps) {
  const { user, isAuthenticated } = useAuth();
  const { isMiniApp, frameContext } = useFrameContext();
  const [signerStatus, setSignerStatus] = useState<SignerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingApproval, setIsCreatingApproval] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.fid) {
      setIsLoading(false);
      return;
    }

    checkSignerStatus();
  }, [isAuthenticated, user?.fid]);

  const checkSignerStatus = async () => {
    if (!user?.fid) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/signer/approval-status?fid=${user.fid}`);
      const data = await response.json();

      if (response.ok) {
        setSignerStatus(data);
      } else {
        setError(data.error || 'Failed to check signer status');
      }
    } catch (err) {
      console.error('Error checking signer status:', err);
      setError('Failed to check signer status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproval = async () => {
    if (!user?.fid) {
      console.error('[SignerApprovalChecker] No user FID available');
      return;
    }

    try {
      setIsCreatingApproval(true);
      console.log('[SignerApprovalChecker] Creating signer approval for FID:', user.fid);

      // Create a new signer and get approval URL
      const response = await fetch('/api/signer/create-approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fid: user.fid })
      });

      const data = await response.json();

      if (response.ok && data.approval_url) {
        console.log('[SignerApprovalChecker] Got approval URL:', data.approval_url);
        console.log('[SignerApprovalChecker] Is mini app:', isMiniApp);
        
        // Navigate to the approval URL (works for both mobile and desktop)
        window.location.href = data.approval_url;
        
      } else {
        console.error('[SignerApprovalChecker] Failed to create approval:', data);
        setError(data.error || 'Failed to create signer approval');
      }
    } catch (error) {
      console.error('[SignerApprovalChecker] Error creating approval:', error);
      setError('Failed to create signer approval');
    } finally {
      setIsCreatingApproval(false);
    }
  };

  // If not authenticated, show children (which should handle auth state)
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          Checking signer approval status...
        </div>
      </div>
    );
  }

  // If there's an error, show error state but allow access
  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span>⚠️ Could not verify signer status: {error}</span>
            <button
              onClick={checkSignerStatus}
              className="ml-2 px-3 py-1 bg-yellow-200 text-yellow-800 rounded text-sm hover:bg-yellow-300"
            >
              Retry
            </button>
          </div>
        </div>
        {children}
      </div>
    );
  }

  // If signer needs approval, show approval prompt
  if (signerStatus?.needs_approval) {
    return (
      <div className="space-y-4">
        <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg">
          <h3 className="font-semibold mb-2">🔐 Signer Approval Required</h3>
          <p className="text-sm mb-3">
            Before you can schedule casts, you need to approve Schedule-Cast to post on your behalf. 
            This is a one-time security step required by Farcaster.
          </p>
          
          {/* Show Warpcast signer approval for both mini app and web users */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleApproval}
              disabled={isCreatingApproval}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isCreatingApproval ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Approval...
                </>
              ) : (
                'Open Warpcast to Approve'
              )}
            </button>
            <button
              onClick={checkSignerStatus}
              disabled={isCreatingApproval}
              className="px-4 py-2 bg-white border border-orange-300 text-orange-800 rounded-lg hover:bg-orange-50 text-sm disabled:opacity-50"
            >
              Check Status Again
            </button>
          </div>
        </div>
        {fallback || (
          <div className="opacity-50 pointer-events-none">
            {children}
          </div>
        )}
      </div>
    );
  }

  // If signer is approved, show children
  return <>{children}</>;
} 