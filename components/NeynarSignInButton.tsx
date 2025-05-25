'use client';

import { useEffect, useRef, useState } from 'react';
import { useUpdateAuthFromSIWN } from '@/lib/auth-context';

interface NeynarSignInButtonProps {
  theme?: 'light' | 'dark';
  className?: string;
  showAsSignerDelegation?: boolean;
  frameUserFid?: number;
}

export default function NeynarSignInButton({
  theme = 'dark',
  className = '',
  showAsSignerDelegation = false,
  frameUserFid
}: NeynarSignInButtonProps) {
  const updateAuthFromSIWN = useUpdateAuthFromSIWN();
  const [isClient, setIsClient] = useState(false);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const addDebugMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const fullMessage = `[${timestamp}] ${message}`;
    setDebugMessages(prev => [...prev.slice(-10), fullMessage]); // Keep last 10 messages
    console.log(fullMessage);
  };

  useEffect(() => {
    // Set client-side flag to prevent hydration issues
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    addDebugMessage("🔧 Initializing NeynarSignInButton...");
    addDebugMessage(`📍 Current URL: ${window.location.href}`);
    addDebugMessage(`👤 Frame User FID: ${frameUserFid}`);
    addDebugMessage(`🎯 Show as Signer Delegation: ${showAsSignerDelegation}`);

    // Check URL parameters for SIWN completion data (backup method)
    const urlParams = new URLSearchParams(window.location.search);
    const siwnToken = urlParams.get('siwn_token');
    const siwnFid = urlParams.get('fid');
    const siwnSigner = urlParams.get('signer_uuid');
    const siwnComplete = urlParams.get('siwn_complete');
    const siwnError = urlParams.get('siwn_error');
    
    if (siwnError) {
      addDebugMessage(`❌ SIWN completion error: ${siwnError}`);
      // Clean up the URL parameter
      if (window.history.replaceState) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }
    }
    
    if (siwnComplete === 'true') {
      addDebugMessage("🎉 Detected return from SIWN completion!");
      // Clean up the URL parameter
      if (window.history.replaceState) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }
      // Start polling to check for authentication
      setTimeout(() => {
        addDebugMessage("🔄 Auto-triggering polling after SIWN completion");
        pollForAuthentication();
      }, 1000);
    }
    
    if (siwnToken || (siwnFid && siwnSigner)) {
      addDebugMessage("🔍 Found SIWN completion data in URL parameters!");
      addDebugMessage(`📊 URL Params - FID: ${siwnFid}, Signer: ${siwnSigner}, Token: ${siwnToken}`);
      
      // If we have basic SIWN data in URL, try to process it
      if (siwnFid && siwnSigner) {
        const siwnData = {
          fid: parseInt(siwnFid),
          signer_uuid: siwnSigner,
          user: {
            username: urlParams.get('username') || '',
            display_name: urlParams.get('display_name') || ''
          }
        };
        
        addDebugMessage("🚀 Processing SIWN data from URL parameters");
        handleSignInSuccess(siwnData);
      }
    }

    // Check localStorage for SIWN completion data (another backup method)
    try {
      const siwnData = localStorage.getItem('neynar_siwn_data') || localStorage.getItem('siwn_data');
      if (siwnData) {
        addDebugMessage("🔍 Found SIWN completion data in localStorage!");
        const parsedData = JSON.parse(siwnData);
        addDebugMessage(`📊 LocalStorage Data: ${JSON.stringify(parsedData)}`);
        
        if (parsedData.fid && parsedData.signer_uuid) {
          addDebugMessage("🚀 Processing SIWN data from localStorage");
          handleSignInSuccess(parsedData);
          // Clear the localStorage data after processing
          localStorage.removeItem('neynar_siwn_data');
          localStorage.removeItem('siwn_data');
        }
      }
    } catch (e) {
      addDebugMessage("⚠️ Error checking localStorage for SIWN data");
    }

    // Define the global callback function exactly as Neynar docs specify
    (window as any).onSignInSuccess = handleSignInSuccess;

    // Add message listener for SIWN popup messages
    const handleMessage = (event: MessageEvent) => {
      addDebugMessage(`📨 Window message from: ${event.origin}`);
      addDebugMessage(`📦 Message data: ${JSON.stringify(event.data)}`);
      
      // Accept messages from various Neynar domains
      const neynarDomains = [
        'https://app.neynar.com',
        'https://neynar.com',
        'https://www.neynar.com',
        'https://api.neynar.com'
      ];
      
      if (neynarDomains.includes(event.origin)) {
        addDebugMessage("📩 Message from Neynar domain confirmed");
        
        if (event.data && typeof event.data === 'object') {
          // Check for various types of success indicators
          const isSuccess = event.data.type === 'SIWN_SUCCESS' || 
                           event.data.type === 'success' ||
                           event.data.success === true ||
                           event.data.fid ||
                           event.data.signer_uuid;
          
          if (isSuccess) {
            addDebugMessage("🚀 Success message detected - triggering callback");
            handleSignInSuccess(event.data);
          } else {
            addDebugMessage("ℹ️ Non-success message from Neynar");
          }
        }
      } else {
        addDebugMessage("⚠️ Message from non-Neynar origin - ignoring");
      }
    };
    
    window.addEventListener('message', handleMessage);
    addDebugMessage("👂 Message listener added");

    // Cleanup
    return () => {
      if ((window as any).onSignInSuccess) {
        delete (window as any).onSignInSuccess;
      }
      window.removeEventListener('message', handleMessage);
    };
  }, [isClient, frameUserFid]);

  const handleSignInSuccess = async (data: any) => {
    addDebugMessage("🎉 SIWN SUCCESS CALLBACK TRIGGERED!");
    addDebugMessage(`📊 FID: ${data.fid}, Signer: ${data.signer_uuid}`);
    setIsProcessing(true);
    
    try {
      if (data.fid && data.signer_uuid) {
        addDebugMessage("🔄 Starting authentication process...");
        
        // Update auth context first
        await updateAuthFromSIWN(data);
        addDebugMessage("✅ Auth context updated");
        
        // Store signer in Supabase
        addDebugMessage("💾 Storing signer in database...");
        
        const storeResponse = await fetch('/api/signer/store', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fid: data.fid,
            signer_uuid: data.signer_uuid,
            username: data.user?.username,
            display_name: data.user?.display_name || data.user?.displayName
          }),
        });
        
        addDebugMessage(`📡 Store API Response: ${storeResponse.status} ${storeResponse.ok ? 'OK' : 'ERROR'}`);
        
        const storeResponseText = await storeResponse.text();
        
        if (!storeResponse.ok) {
          addDebugMessage(`❌ Store API Error: ${storeResponseText}`);
          alert(`Failed to store signer data. Status: ${storeResponse.status}. Please try again.`);
        } else {
          addDebugMessage("✅ Signer stored successfully!");
          
          // Let's also call the debug endpoint to verify data was stored
          addDebugMessage("🔍 Verifying data in database...");
          try {
            const debugResponse = await fetch(`/api/debug-user?fid=${data.fid}`);
            const debugData = await debugResponse.json();
            
            if (debugData.has_signer && debugData.is_delegated) {
              addDebugMessage("🎉 SUCCESS: Data confirmed in database!");
            } else {
              addDebugMessage("⚠️ WARNING: Data not properly stored in database");
            }
          } catch (debugError) {
            addDebugMessage("❌ Debug verification failed");
          }
        }
        
        addDebugMessage("🎉 Authentication process complete!");
      } else {
        addDebugMessage(`❌ Missing required data: FID=${data.fid}, Signer=${data.signer_uuid}`);
      }
    } catch (error) {
      addDebugMessage(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      alert('Sign-in successful, but there was an issue processing your signer. You may need to approve it manually.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignInClick = () => {
    const clientId = process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || '3bc04533-6297-438b-8d85-e655f3fc19f9';
    const redirectUri = encodeURIComponent('https://schedule-cast.vercel.app/api/siwn-complete');
    const siwnUrl = `https://app.neynar.com/login?client_id=${clientId}&redirect_uri=${redirectUri}`;
    
    addDebugMessage(`🔗 SIWN URL: ${siwnUrl}`);
    addDebugMessage(`🚀 Attempting to open SIWN in external browser`);
    
    // For mini apps, try multiple methods to force external browser opening
    try {
      // Method 1: Try window.top (works if we're in iframe/webview)
      if (window.top && window.top !== window) {
        addDebugMessage(`🎯 Using window.top.location.href for external opening`);
        window.top.location.href = siwnUrl;
        return;
      }
      
      // Method 2: Try window.open with _blank target
      addDebugMessage(`🎯 Trying window.open with _blank target`);
      const newWindow = window.open(siwnUrl, '_blank', 'noopener,noreferrer');
      
      if (newWindow) {
        addDebugMessage(`✅ Successfully opened in new window`);
        // Start polling immediately since user will return via external completion
        setTimeout(() => {
          pollForAuthentication();
        }, 3000);
      } else {
        throw new Error('Popup was blocked');
      }
    } catch (error) {
      // Method 3: Fallback to current window navigation
      addDebugMessage(`⚠️ External opening failed: ${error}, falling back to current window`);
      window.location.href = siwnUrl;
    }
  };

  // Polling function to check if authentication completed
  const pollForAuthentication = async () => {
    if (!frameUserFid || isPolling) return;
    
    setIsPolling(true);
    addDebugMessage("🔄 Started polling for authentication completion...");
    
    let attempts = 0;
    const maxAttempts = 30; // Poll for 30 seconds (every 1 second)
    
    const poll = async () => {
      attempts++;
      addDebugMessage(`📡 Polling attempt ${attempts}/${maxAttempts}`);
      
      try {
        const response = await fetch(`/api/debug-user?fid=${frameUserFid}`);
        const data = await response.json();
        
        if (data.has_signer && data.is_delegated) {
          addDebugMessage("🎉 Authentication detected via polling!");
          setIsPolling(false);
          
          // Update auth context with the found data
          const authData = {
            fid: frameUserFid,
            signer_uuid: data.user.signer_uuid,
            user: {
              username: data.user.username,
              display_name: data.user.display_name
            }
          };
          
          await updateAuthFromSIWN(authData);
          addDebugMessage("✅ Auth context updated from polling");
          return;
        }
        
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000); // Poll every 1 second
        } else {
          addDebugMessage("⏰ Polling timeout - authentication not detected");
          setIsPolling(false);
        }
      } catch (error) {
        addDebugMessage(`❌ Polling error: ${error instanceof Error ? error.message : String(error)}`);
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          setIsPolling(false);
        }
      }
    };
    
    // Start polling after a 2-second delay to allow for SIWN completion
    setTimeout(poll, 2000);
  };

  if (!isClient) {
    return (
      <div className={`flex items-center justify-center h-11 bg-purple-600 rounded-lg ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
      </div>
    );
  }

  // Configure button text based on context
  let buttonText = 'Sign in with Neynar';
  if (showAsSignerDelegation) {
    buttonText = 'Grant Posting Permissions';
  } else if (frameUserFid) {
    buttonText = 'Connect to Schedule-Cast';
  }

  return (
    <div className={className}>
      <button
        onClick={handleSignInClick}
        disabled={isProcessing}
        className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg text-sm font-medium transition-colors"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Processing...
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            {buttonText}
          </>
        )}
      </button>
      
      {/* Debug messages for development */}
      {process.env.NODE_ENV === 'development' && debugMessages.length > 0 && (
        <div className="mt-2 text-xs bg-gray-100 p-2 rounded max-h-32 overflow-y-auto">
          {debugMessages.map((msg, i) => (
            <div key={i} className="text-gray-600">{msg}</div>
          ))}
        </div>
      )}
      
      {/* Backup polling button for troubleshooting */}
      {frameUserFid && (
        <div className="mt-2">
          <button
            onClick={pollForAuthentication}
            disabled={isPolling}
            className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm disabled:bg-orange-400"
          >
            {isPolling ? 'Checking...' : 'Check Auth Status'}
          </button>
          <p className="text-xs text-gray-500 mt-1">
            💡 If SIWN completes but callback doesn't work, click "Check Auth Status" above
          </p>
        </div>
      )}
    </div>
  );
} 