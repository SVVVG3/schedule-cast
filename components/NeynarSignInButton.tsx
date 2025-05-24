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
      console.log("Sign-in success with data:", data);
      
      try {
        if (data.fid && data.signer_uuid) {
          // Update auth context
          await updateAuthFromSIWN(data);
          
          // Store signer in Supabase and check approval status
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
          
          // Check signer approval status
          const approvalResponse = await fetch(`/api/signer/approval-status?fid=${data.fid}`);
          const approvalData = await approvalResponse.json();
          
          console.log('SIWN auth complete! Signer status:', approvalData);
          
          // If signer needs approval, show the user a message
          if (approvalData.needs_approval && approvalData.approval_url) {
            alert(`🎉 Sign-in successful! 
            
However, you need to approve Schedule-Cast to post on your behalf.

Click OK to be redirected to Warpcast for approval (this is a one-time step).

After approval, you can schedule casts!`);
            
            // Open approval URL
            window.open(approvalData.approval_url, '_blank');
          } else if (approvalData.status === 'approved') {
            alert('🎉 Sign-in successful! Your signer is approved and ready to use!');
          }
        }
      } catch (error) {
        console.error('Error handling SIWN success:', error);
        alert('Sign-in successful, but there was an issue checking signer status. You may need to approve your signer in Warpcast.');
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