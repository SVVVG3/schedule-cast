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
  const { isMiniApp, sdk } = useFrameContext();
  const [hasSigner, setHasSigner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
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

  const handleGetPostingPermissions = async () => {
    if (!user?.fid || !sdk) {
      addDebugMessage(`❌ Missing requirements: FID=${user?.fid}, SDK=${!!sdk}`);
      return;
    }

    setIsProcessing(true);
    addDebugMessage(`🚀 Starting Frame SDK posting permissions flow for FID: ${user.fid}`);

    try {
      // Step 1: Use Frame SDK signIn to get SIWF credential
      addDebugMessage(`🔐 Requesting SIWF credential via Frame SDK...`);
      
      // Generate a secure alphanumeric nonce (SIWF requires alphanumeric only, min 8 chars)
      const generateAlphanumericNonce = (length: number = 16): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };
      
      const nonce = generateAlphanumericNonce(16);
      addDebugMessage(`🎲 Generated alphanumeric nonce: ${nonce}`);
      
      const signInResult = await sdk.actions.signIn({
        nonce,
        acceptAuthAddress: true
      });
      
      addDebugMessage(`✅ SIWF credential received`);
      addDebugMessage(`📝 Message length: ${signInResult.message.length}`);
      
      // Step 2: Send SIWF credential to our API to get Neynar signer
      addDebugMessage(`📡 Sending SIWF to API for Neynar signer creation...`);
      
      const response = await fetch('/api/signer/create-from-siwf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fid: user.fid,
          message: signInResult.message,
          signature: signInResult.signature,
          nonce
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `API error: ${response.status}`);
      }
      
      addDebugMessage(`✅ Neynar signer created successfully!`);
      addDebugMessage(`🔑 Signer UUID: ${result.signer_uuid}`);
      
      // Step 3: Store the signer in our database
      addDebugMessage(`💾 Storing signer in database...`);
      
      const storeResponse = await fetch('/api/signer/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fid: user.fid,
          signer_uuid: result.signer_uuid,
          username: user.username,
          display_name: user.displayName
        }),
      });
      
      if (!storeResponse.ok) {
        const storeError = await storeResponse.text();
        throw new Error(`Failed to store signer: ${storeError}`);
      }
      
      addDebugMessage(`✅ Signer stored in database successfully!`);
      
      // Step 4: Update local state
      setHasSigner(true);
      addDebugMessage(`🎉 Posting permissions granted! User can now schedule casts.`);
      
    } catch (error) {
      addDebugMessage(`❌ Error getting posting permissions: ${error instanceof Error ? error.message : String(error)}`);
      alert(`Failed to get posting permissions: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
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
                  ? ' This uses Frame SDK authentication - no external browser required!'
                  : ' This uses Sign In with Neynar for secure authorization.'
                }
              </p>
            </div>
            
            {isMiniApp && sdk ? (
              // Mini App Environment: Use Frame SDK signIn
              <button
                onClick={handleGetPostingPermissions}
                disabled={isProcessing}
                className="w-full flex items-center justify-center px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg font-medium transition-colors"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Getting Permissions...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Grant Posting Permissions
                  </>
                )}
              </button>
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
                  ✅ Uses Frame SDK - works perfectly in mini apps<br/>
                  ✅ No external browser popups required<br/>
                  ✅ Secure Farcaster authentication
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