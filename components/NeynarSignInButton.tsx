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
  const containerRef = useRef<HTMLDivElement>(null);
  const updateAuthFromSIWN = useUpdateAuthFromSIWN();
  const [isClient, setIsClient] = useState(false);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

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
        (window as any).onSignInSuccess?.(siwnData);
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
          (window as any).onSignInSuccess?.(parsedData);
          // Clear the localStorage data after processing
          localStorage.removeItem('neynar_siwn_data');
          localStorage.removeItem('siwn_data');
        }
      }
    } catch (e) {
      addDebugMessage("⚠️ Error checking localStorage for SIWN data");
    }

    // Define the global callback function exactly as Neynar docs specify
    (window as any).onSignInSuccess = async (data: any) => {
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

    // Load the official Neynar SIWN script
    if (!document.getElementById('neynar-siwn-script')) {
      const script = document.createElement('script');
      script.id = 'neynar-siwn-script';
      script.src = 'https://neynarxyz.github.io/siwn/raw/1.2.0/index.js';
      script.async = true;
      document.body.appendChild(script);
      addDebugMessage("📦 Neynar script loaded");
    }

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
            (window as any).onSignInSuccess?.(event.data);
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

    // Create the SIWN widget div using standard configuration
    if (containerRef.current) {
      const clientId = process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || '3bc04533-6297-438b-8d85-e655f3fc19f9';
      
      // Configure button text based on context
      let buttonText = 'Sign in with Neynar';
      if (showAsSignerDelegation) {
        buttonText = 'Grant Posting Permissions';
      } else if (frameUserFid) {
        buttonText = 'Connect to Schedule-Cast';
      }
      
      // For mini app environment, we don't want redirect - we want the callback to fire in the same context
      addDebugMessage(`🔧 Configuring SIWN for mini app environment`);
      
      containerRef.current.innerHTML = `
        <div
          class="neynar_signin"
          data-client_id="${clientId}"
          data-success-callback="onSignInSuccess"
          data-theme="${theme}"
          data-variant="neynar"
          data-text="${buttonText}"
          data-width="100%"
          data-height="44px">
        </div>
      `;
      
      addDebugMessage(`🎨 SIWN widget created: ${buttonText} (no redirect_uri)`);
    }

    // Cleanup
    return () => {
      if ((window as any).onSignInSuccess) {
        delete (window as any).onSignInSuccess;
      }
      window.removeEventListener('message', handleMessage);
    };
  }, [isClient, theme, updateAuthFromSIWN, showAsSignerDelegation, frameUserFid]);

  if (!isClient) {
    return (
      <div className={`flex items-center justify-center h-11 bg-purple-600 rounded-lg ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div ref={containerRef}></div>
      
      {/* Debug Panel - only show if there are messages */}
      {debugMessages.length > 0 && (
        <div className="mt-4 p-3 bg-gray-100 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-700">Debug Log</h4>
            {isProcessing && (
              <div className="flex items-center gap-1 text-blue-600">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                <span className="text-xs">Processing...</span>
              </div>
            )}
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {debugMessages.map((message, index) => (
              <div key={index} className="text-xs text-gray-600 font-mono">
                {message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 