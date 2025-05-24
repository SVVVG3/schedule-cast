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
          
          // Test the signer immediately after SIWN success
          console.log("[SIWN] Testing signer immediately after sign-in...");
          try {
            const testResponse = await fetch(`/api/test-siwn-signer?fid=${data.fid}`);
            const testData = await testResponse.json();
            console.log("[SIWN] Immediate signer test result:", testData);
            
            if (testData.results?.tests?.post_cast?.success) {
              alert('🎉 Sign-in successful! Your signer is working and can post casts immediately!');
            } else if (testData.results?.tests?.signer_info?.success) {
              // Signer exists but can't post yet
              const signerStatus = testData.results.tests.signer_info.status;
              console.log("[SIWN] Signer exists but status is:", signerStatus);
              
              if (signerStatus === 'approved') {
                alert('🎉 Sign-in successful! Your signer is approved and ready to use!');
              } else {
                alert(`⏳ Sign-in successful! Your signer status is "${signerStatus}". 

This might be temporary - SIWN signers should be approved automatically. Please try scheduling a cast, and if it fails, the app will guide you through manual approval.`);
              }
            } else {
              // Signer doesn't exist in Neynar yet
              console.warn("[SIWN] Signer not found in Neynar immediately after SIWN success");
              alert(`⏳ Sign-in successful! However, your signer isn't active in Neynar yet.

This might be a temporary delay. Please try scheduling a cast in a few minutes. If it still fails, the app will guide you through manual approval.`);
            }
          } catch (testError) {
            console.error("[SIWN] Error testing signer immediately:", testError);
            alert('🎉 Sign-in successful! We couldn\'t test your signer immediately, but you can try scheduling casts now.');
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

    // Create the SIWN widget div exactly as documented
    if (containerRef.current) {
      const clientId = process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || '3bc04533-6297-438b-8d85-e655f3fc19f9';
      
      containerRef.current.innerHTML = `
        <div
          class="neynar_signin"
          data-client_id="${clientId}"
          data-success-callback="onSignInSuccess"
          data-theme="${theme}">
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