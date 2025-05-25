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

  const handleMiniAppSIWN = async () => {
    if (!user?.fid || !sdk) {
      addDebugMessage(`❌ Missing user FID or SDK`);
      return;
    }

    setIsProcessing(true);
    addDebugMessage(`🚀 Starting SIWN flow for posting permissions in mini app`);

    try {
      // Get auth URL from our server
      addDebugMessage(`📡 Fetching authorization URL...`);
      
      const authResponse = await fetch('/api/signer/get-auth-url', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!authResponse.ok) {
        throw new Error(`Failed to get auth URL: ${authResponse.status}`);
      }

      const { authorizationUrl } = await authResponse.json();
      addDebugMessage(`🔗 Auth URL: ${authorizationUrl}`);
      
      // Use Frame SDK's openUrl action for mini apps - this is the correct approach
      addDebugMessage(`📱 Using Frame SDK openUrl to open external browser...`);
      
      try {
        // This is the proper way to open external URLs in Frame SDK mini apps
        await sdk.actions.openUrl(authorizationUrl);
        addDebugMessage(`✅ Successfully called sdk.actions.openUrl`);
      } catch (error) {
        addDebugMessage(`❌ Frame SDK openUrl failed: ${error}`);
        
        // Fallback: try direct location methods as last resort
        addDebugMessage(`🎯 Fallback: Using window location methods...`);
        if (window.top && window.top !== window) {
          window.top.location.href = authorizationUrl;
        } else {
          window.location.href = authorizationUrl;
        }
      }
      
    } catch (error) {
      addDebugMessage(`❌ Error starting SIWN: ${error instanceof Error ? error.message : String(error)}`);
      alert(`Failed to start SIWN flow: ${error instanceof Error ? error.message : String(error)}`);
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
                  ? ' This will open in your external browser for authorization.'
                  : ' This uses Sign In with Neynar for secure authorization.'
                }
              </p>
            </div>
            
            <div className="space-y-3">
              {isMiniApp ? (
                // Mini App Environment: Use server-based auth URL approach
                <button
                  onClick={handleMiniAppSIWN}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg font-medium transition-colors"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Opening Browser...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M7 7h10v10M14 3h7v7M10 14l7-7" />
                      </svg>
                      Grant Posting Permissions
                    </>
                  )}
                </button>
              ) : (
                // Web Environment: Use standard SIWN
                <NeynarSignInButton 
                  theme="light" 
                  showAsSignerDelegation={true}
                  frameUserFid={user?.fid}
                />
              )}
              
              <button
                onClick={checkUserSigner}
                className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm transition-colors"
              >
                Check Status Again
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mt-3">
              ✅ Uses Sign In with Neynar<br/>
              ✅ Secure posting permissions<br/>
              {isMiniApp 
                ? '📱 Opens in external browser for security'
                : '🌐 One-time authorization process'
              }
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