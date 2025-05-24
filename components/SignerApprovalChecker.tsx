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

  const handleApproval = () => {
    if (signerStatus?.approval_url) {
      console.log('[SignerApprovalChecker] Opening approval URL:', signerStatus.approval_url);
      console.log('[SignerApprovalChecker] Is mini app:', isMiniApp);
      
      if (isMiniApp) {
        // In mini app environment, try to open in current window which should stay in Farcaster
        window.location.href = signerStatus.approval_url;
      } else {
        // In web environment, open in new tab
        window.open(signerStatus.approval_url, '_blank');
      }
      
      // Recheck status after a short delay to see if user approved
      setTimeout(() => {
        checkSignerStatus();
      }, 3000);
    } else {
      console.error('[SignerApprovalChecker] No approval URL available');
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
          
          {/* Show SIWN for mini app users, Warpcast approval for web users */}
          {isMiniApp ? (
            <div className="space-y-3">
              <p className="text-sm text-orange-700">
                Complete authentication with Neynar to get posting permissions:
              </p>
              <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3">
                <button
                  onClick={() => {
                    const clientId = process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || '3bc04533-6297-438b-8d85-e655f3fc19f9';
                    const redirectUri = encodeURIComponent('https://schedule-cast.vercel.app/api/siwn-complete');
                    const siwnUrl = `https://app.neynar.com/login?client_id=${clientId}&redirect_uri=${redirectUri}`;
                    
                    // Open in external browser
                    window.open(siwnUrl, '_blank');
                  }}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center justify-center space-x-2"
                >
                  <span>🌐</span>
                  <span>Open Neynar Authentication</span>
                </button>
                <div className="mt-3">
                  <button
                    onClick={() => {
                      // Check auth status after external SIWN
                      if (frameContext?.user?.fid) {
                        fetch(`/api/debug-user?fid=${frameContext.user.fid}`)
                          .then(res => res.json())
                          .then(data => {
                            if (data.has_signer && data.is_delegated) {
                              // Refresh the page to update auth state
                              window.location.reload();
                            } else {
                              alert('Authentication not detected yet. Please try again or complete the authentication process.');
                            }
                          })
                          .catch(() => {
                            alert('Error checking authentication status.');
                          });
                      }
                    }}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                  >
                    ✅ I completed authentication - Check Status
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleApproval}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
              >
                Open Warpcast to Approve
              </button>
              <button
                onClick={checkSignerStatus}
                className="px-4 py-2 bg-white border border-orange-300 text-orange-800 rounded-lg hover:bg-orange-50 text-sm"
              >
                Check Status Again
              </button>
            </div>
          )}
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