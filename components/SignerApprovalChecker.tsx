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
  const [isProcessing, setIsProcessing] = useState(false);
  const [signerApprovalUrl, setSignerApprovalUrl] = useState<string | null>(null);
  const [signerUuid, setSignerUuid] = useState<string | null>(null);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);

  const addDebugMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const fullMessage = `[${timestamp}] ${message}`;
    setDebugMessages(prev => [...prev.slice(-10), fullMessage]);
    console.log(fullMessage);
  };

  useEffect(() => {
    if (!isAuthenticated || !user?.fid) {
      setIsLoading(false);
      return;
    }

    checkUserSigner();
  }, [isAuthenticated, user?.fid]);

  const checkUserSigner = async () => {
    if (!user?.fid) return;
    
    addDebugMessage(`🔍 Checking signer for FID: ${user.fid}`);
    
    try {
      const response = await fetch(`/api/debug-user?fid=${user.fid}`);
      const data = await response.json();
      
      addDebugMessage(`📊 Signer check result: has_signer=${data.has_signer}, is_delegated=${data.is_delegated}`);
      
      if (data.has_signer && data.is_delegated) {
        setHasSigner(true);
        addDebugMessage(`✅ User has valid signer - showing main app`);
      } else {
        setHasSigner(false);
        addDebugMessage(`❌ User needs signer approval`);
      }
    } catch (error) {
      addDebugMessage(`❌ Error checking signer: ${error}`);
      setHasSigner(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSigner = async () => {
    if (!user?.fid) {
      addDebugMessage(`❌ Missing user FID`);
      return;
    }

    setIsProcessing(true);
    addDebugMessage(`🚀 Creating managed signer for FID: ${user.fid}`);

    try {
      // Step 1: Create managed signer via Neynar API
      addDebugMessage(`📡 Creating Neynar managed signer...`);
      
      const response = await fetch('/api/signer/create-managed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fid: user.fid,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `API error: ${response.status}`);
      }
      
      addDebugMessage(`✅ Managed signer created successfully!`);
      addDebugMessage(`🔑 Signer UUID: ${result.signer_uuid}`);
      addDebugMessage(`🔗 Approval URL: ${result.signer_approval_url}`);
      
      // Step 2: Store signer info and show approval flow
      setSignerUuid(result.signer_uuid);
      setSignerApprovalUrl(result.signer_approval_url);
      
      addDebugMessage(`📱 Please approve the signer in Warpcast to enable posting`);
      
    } catch (error) {
      addDebugMessage(`❌ Error creating signer: ${error instanceof Error ? error.message : String(error)}`);
      alert(`Failed to create signer: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckApprovalStatus = async () => {
    if (!signerUuid) return;
    
    addDebugMessage(`🔍 Checking approval status for signer: ${signerUuid}`);
    
    try {
      const response = await fetch(`/api/signer/status?signer_uuid=${signerUuid}`);
      const data = await response.json();
      
      addDebugMessage(`📊 Signer status: ${data.status}`);
      
      if (data.status === 'approved') {
        // Store the approved signer
        const storeResponse = await fetch('/api/signer/store', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fid: user?.fid,
            signer_uuid: signerUuid,
            username: user?.username,
            display_name: user?.displayName
          }),
        });
        
        if (storeResponse.ok) {
          addDebugMessage(`✅ Signer approved and stored! Posting permissions granted.`);
          setHasSigner(true);
          setSignerApprovalUrl(null);
          setSignerUuid(null);
        } else {
          addDebugMessage(`❌ Failed to store approved signer`);
        }
      } else {
        addDebugMessage(`⏳ Signer not yet approved. Status: ${data.status}`);
      }
    } catch (error) {
      addDebugMessage(`❌ Error checking status: ${error}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking posting permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <p className="text-gray-600">Please sign in to continue</p>
        </div>
      </div>
    );
  }

  if (!hasSigner) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Grant Posting Permissions
              </h2>
              <p className="text-gray-600 text-sm">
                To schedule casts, we need permission to post on your behalf.
                {isMiniApp 
                  ? ' This requires approval in Warpcast (opens in external app).'
                  : ' This uses Sign In with Neynar for secure authorization.'
                }
              </p>
            </div>
            
            {isMiniApp ? (
              // Mini App Environment: Use managed signer with QR code/deeplink
              <div className="space-y-4">
                {!signerApprovalUrl ? (
                  <button
                    onClick={handleCreateSigner}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg font-medium transition-colors"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Signer...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create Posting Permissions
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800 mb-3">
                        <strong>Step 2:</strong> Approve the signer in Warpcast to enable posting permissions.
                      </p>
                      <a
                        href={signerApprovalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M7 7h10v10M14 3h7v7M10 14l7-7" />
                        </svg>
                        Open Warpcast to Approve
                      </a>
                    </div>
                    
                    <button
                      onClick={handleCheckApprovalStatus}
                      className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm transition-colors"
                    >
                      Check Approval Status
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Regular Web Environment: Use SIWN
              <div className="space-y-3">
                <NeynarSignInButton 
                  theme="light" 
                  showAsSignerDelegation={true}
                  frameUserFid={user?.fid}
                />
                <button
                  onClick={checkUserSigner}
                  className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm transition-colors"
                >
                  Check Status Again
                </button>
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-3">
              {isMiniApp ? (
                <>
                  ✅ Uses Neynar managed signers<br/>
                  ⚠️ Requires Warpcast approval (one-time)<br/>
                  ✅ Secure posting permissions
                </>
              ) : (
                <>
                  ✅ Uses Sign In with Neynar<br/>
                  ✅ Secure posting permissions<br/>
                  ✅ One-time authorization process
                </>
              )}
            </p>
          </div>
          
          {/* Debug messages for development */}
          {process.env.NODE_ENV === 'development' && debugMessages.length > 0 && (
            <div className="mt-4 text-xs bg-gray-100 p-3 rounded max-h-32 overflow-y-auto text-left">
              <div className="mb-1 font-semibold text-gray-700">
                Environment: {isMiniApp ? 'Mini App' : 'Web Browser'}
              </div>
              {debugMessages.map((msg, i) => (
                <div key={i} className="text-gray-600">{msg}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 