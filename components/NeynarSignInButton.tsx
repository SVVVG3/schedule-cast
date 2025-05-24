'use client';

import { useEffect, useRef, useState } from 'react';
import { useUpdateAuthFromSIWN } from '@/lib/auth-context';

interface NeynarSignInButtonProps {
  theme?: 'light' | 'dark';
  className?: string;
}

export default function NeynarSignInButton({
  theme = 'dark',
  className = ''
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

    // Detect if we're in mobile/frame environment
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                    window.location.pathname.startsWith('/miniapp') ||
                    window.location.search.includes('miniApp=true') ||
                    window.parent !== window;

    // Define the global callback function exactly as Neynar docs specify
    (window as any).onSignInSuccess = async (data: any) => {
      console.log("===== SIWN SUCCESS DATA =====");
      console.log("Full SIWN response:", JSON.stringify(data, null, 2));
      console.log("FID:", data.fid);
      console.log("Signer UUID:", data.signer_uuid);
      console.log("User data:", data.user);
      console.log("============================");
      
      try {
        if (data.fid && data.signer_uuid) {
          // Update auth context first
          await updateAuthFromSIWN(data);
          
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
          
          // Check signer status without posting test casts
          console.log("[SIWN] Checking signer status after sign-in (no test posts)...");
          try {
            const statusResponse = await fetch(`/api/signer/approval-status?fid=${data.fid}`);
            const statusData = await statusResponse.json();
            console.log("[SIWN] Signer status check result:", statusData);
            
            if (statusData.status === 'approved') {
              alert('🎉 Sign-in successful! Your signer is ready to schedule casts!');
            } else if (statusData.needs_approval) {
              alert(`⏳ Sign-in successful! Your signer may need approval in Warpcast before posting.

You can try scheduling casts now - if approval is needed, the app will guide you through the process.`);
            } else {
              alert('🎉 Sign-in successful! You can now schedule casts.');
            }
          } catch (statusError) {
            console.error("[SIWN] Error checking signer status:", statusError);
            alert('🎉 Sign-in successful! You can now try scheduling casts.');
          }
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
    }

    // Create the SIWN widget div with mobile-optimized configuration
    if (containerRef.current) {
      const clientId = process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || '3bc04533-6297-438b-8d85-e655f3fc19f9';
      
      // For mobile/frame environment, configure for direct redirect instead of QR code
      // Use data-redirect_url to specify where mobile users should be redirected
      const currentUrl = window.location.origin + window.location.pathname;
      const mobileConfig = isMobile ? 
        `data-modal="true" data-redirect_url="${currentUrl}"` : '';
      
      containerRef.current.innerHTML = `
        <div
          class="neynar_signin"
          data-client_id="${clientId}"
          data-success-callback="onSignInSuccess"
          data-theme="${theme}"
          ${mobileConfig}>
        </div>
      `;
    }

    // Cleanup
    return () => {
      if ((window as any).onSignInSuccess) {
        delete (window as any).onSignInSuccess;
      }
    };
  }, [isClient, theme, updateAuthFromSIWN]);

  return (
    <div className={className}>
      <div ref={containerRef}></div>
    </div>
  );
} 