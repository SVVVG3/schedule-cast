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

  useEffect(() => {
    // Set client-side flag to prevent hydration issues
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    console.log("[SIWN] Initializing NeynarSignInButton...");
    console.log("[SIWN] Current URL:", window.location.href);
    console.log("[SIWN] Frame User FID:", frameUserFid);
    console.log("[SIWN] Show as Signer Delegation:", showAsSignerDelegation);

    // Define the global callback function exactly as Neynar docs specify
    (window as any).onSignInSuccess = async (data: any) => {
      console.log("===== SIWN SUCCESS CALLBACK TRIGGERED =====");
      console.log("Timestamp:", new Date().toISOString());
      console.log("Current URL:", window.location.href);
      console.log("Full SIWN response:", JSON.stringify(data, null, 2));
      console.log("FID:", data.fid);
      console.log("Signer UUID:", data.signer_uuid);
      console.log("User data:", data.user);
      console.log("===========================================");
      
      try {
        if (data.fid && data.signer_uuid) {
          console.log("[SIWN] Starting authentication process...");
          
          // Update auth context first
          await updateAuthFromSIWN(data);
          console.log("[SIWN] Auth context updated");
          
          // Store signer in Supabase
          console.log("[SIWN] Storing signer in database...");
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
          
          if (!storeResponse.ok) {
            console.error("[SIWN] Failed to store signer:", await storeResponse.text());
          } else {
            console.log("[SIWN] Signer stored successfully");
          }
          
          // Show appropriate success message
          if (showAsSignerDelegation) {
            console.log('🎉 Posting permissions granted! You can now schedule casts.');
          } else if (frameUserFid && data.fid === frameUserFid) {
            console.log('🎉 Sign-in successful! You can now schedule casts.');
          } else {
            console.log('🎉 Sign-in successful! You can now schedule casts.');
          }
          
          // Do NOT reload the page - let the auth context handle the state update
          console.log("[SIWN] Authentication complete - state should update automatically");
        } else {
          console.error("[SIWN] Missing required data:", { fid: data.fid, signer_uuid: data.signer_uuid });
        }
      } catch (error) {
        console.error('Error handling SIWN success:', error);
        alert('Sign-in successful, but there was an issue processing your signer. You may need to approve it manually.');
      }
    };

    // Load the official Neynar SIWN script
    if (!document.getElementById('neynar-siwn-script')) {
      const script = document.createElement('script');
      script.id = 'neynar-siwn-script';
      script.src = 'https://neynarxyz.github.io/siwn/raw/1.2.0/index.js';
      script.async = true;
      document.body.appendChild(script);
      console.log("[SIWN] Neynar script loaded");
    }

    // Add message listener for SIWN popup messages
    const handleMessage = (event: MessageEvent) => {
      console.log("[SIWN] Received window message:", event.origin, event.data);
      if (event.origin === 'https://app.neynar.com' || event.origin === 'https://neynar.com') {
        console.log("[SIWN] Message from Neynar:", event.data);
        if (event.data && typeof event.data === 'object') {
          if (event.data.type === 'SIWN_SUCCESS' || event.data.fid) {
            console.log("[SIWN] Triggering success callback from message");
            (window as any).onSignInSuccess?.(event.data);
          }
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    console.log("[SIWN] Message listener added");

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
      
      // Detect current URL for redirect - use mini app URL if available
      const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
      const isInMiniApp = currentUrl.includes('/miniapp') || currentUrl.includes('schedule-cast.vercel.app');
      const redirectUri = isInMiniApp ? 'https://schedule-cast.vercel.app/miniapp' : currentUrl;
      
      containerRef.current.innerHTML = `
        <div
          class="neynar_signin"
          data-client_id="${clientId}"
          data-success-callback="onSignInSuccess"
          data-redirect_uri="${redirectUri}"
          data-theme="${theme}"
          data-variant="neynar"
          data-text="${buttonText}"
          data-width="100%"
          data-height="44px">
        </div>
      `;
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
    </div>
  );
} 