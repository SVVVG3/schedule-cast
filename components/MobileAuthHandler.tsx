'use client';

import { useEffect } from 'react';
import { useUpdateAuthFromSIWN } from '@/lib/auth-context';

export default function MobileAuthHandler() {
  const updateAuthFromSIWN = useUpdateAuthFromSIWN();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get('siwn_success');
      const error = urlParams.get('error');
      const fid = urlParams.get('fid');
      const signerUuid = urlParams.get('signer_uuid');
      const userDataStr = urlParams.get('user_data');

      if (error) {
        console.error('[Mobile Auth Handler] Authentication error:', error);
        alert(`Authentication failed: ${error}`);
        // Clear URL params
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      if (success === 'true' && fid && signerUuid) {
        console.log('[Mobile Auth Handler] Processing successful authentication...');
        
        try {
          let userData = null;
          if (userDataStr) {
            try {
              userData = JSON.parse(decodeURIComponent(userDataStr));
            } catch (e) {
              console.warn('[Mobile Auth Handler] Failed to parse user data:', e);
            }
          }

          const authData = {
            fid: parseInt(fid),
            signer_uuid: signerUuid,
            user: userData || {
              fid: parseInt(fid),
              username: `user${fid}`,
              display_name: `User ${fid}`,
              pfp_url: null,
            }
          };

          console.log('[Mobile Auth Handler] Auth data:', authData);

          // Update auth context
          await updateAuthFromSIWN(authData);
          
          // Store signer in database
          console.log('[Mobile Auth Handler] Storing signer in database...');
          const storeResponse = await fetch('/api/signer/store', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fid: authData.fid,
              signer_uuid: authData.signer_uuid,
              username: authData.user?.username,
              display_name: authData.user?.display_name || authData.user?.displayName
            }),
          });
          
          if (!storeResponse.ok) {
            console.error('[Mobile Auth Handler] Failed to store signer:', await storeResponse.text());
          } else {
            console.log('[Mobile Auth Handler] Signer stored successfully');
          }

          // Check signer status
          console.log('[Mobile Auth Handler] Checking signer status...');
          try {
            const statusResponse = await fetch(`/api/signer/approval-status?fid=${authData.fid}`);
            const statusData = await statusResponse.json();
            console.log('[Mobile Auth Handler] Signer status check result:', statusData);
            
            if (statusData.status === 'approved') {
              alert('🎉 Sign-in successful! Your signer is ready to schedule casts!');
            } else if (statusData.needs_approval) {
              alert(`⏳ Sign-in successful! Your signer may need approval in Warpcast before posting.

You can try scheduling casts now - if approval is needed, the app will guide you through the process.`);
            } else {
              alert('🎉 Sign-in successful! You can now schedule casts.');
            }
          } catch (statusError) {
            console.error('[Mobile Auth Handler] Error checking signer status:', statusError);
            alert('🎉 Sign-in successful! You can now try scheduling casts.');
          }

          // Clear URL params
          window.history.replaceState({}, '', window.location.pathname);
          
        } catch (error) {
          console.error('[Mobile Auth Handler] Error processing authentication:', error);
          alert('Sign-in successful, but there was an issue processing your signer. You may need to approve it manually.');
          // Clear URL params
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    };

    // Check if we have callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('siwn_success') || urlParams.has('error')) {
      handleAuthCallback();
    }
  }, [updateAuthFromSIWN]);

  return null; // This component doesn't render anything
} 