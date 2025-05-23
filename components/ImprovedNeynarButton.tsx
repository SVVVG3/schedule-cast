'use client';

import { NeynarAuthButton, NeynarContextProvider, Theme } from "@neynar/react";
import "@neynar/react/dist/style.css";
import { useUpdateAuthFromSIWN } from '@/lib/auth-context';

interface ImprovedNeynarButtonProps {
  className?: string;
}

export default function ImprovedNeynarButton({ className = '' }: ImprovedNeynarButtonProps) {
  const updateAuthFromSIWN = useUpdateAuthFromSIWN();

  const handleAuthSuccess = async (data: any) => {
    console.log("Neynar auth success:", data);
    
    try {
      if (data.fid && data.signer_uuid) {
        // Update the auth context
        updateAuthFromSIWN(data);
        
        // Store the signer in Supabase
        const response = await fetch('/api/signer/store', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fid: data.fid,
            signer_uuid: data.signer_uuid,
            username: data.user?.username,
            display_name: data.user?.displayName || data.user?.display_name
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error storing signer:', errorData);
        } else {
          console.log('Signer stored successfully in Supabase');
        }
      }
    } catch (error) {
      console.error('Error in auth success handler:', error);
    }
  };

  const handleSignout = () => {
    console.log("User signed out");
    // Clear auth state if needed
  };

  const clientId = process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || '3bc04533-6297-438b-8d85-e655f3fc19f9';

  return (
    <div className={className}>
      <NeynarContextProvider
        settings={{
          clientId: clientId,
          defaultTheme: Theme.Dark,
          eventsCallbacks: {
            onAuthSuccess: handleAuthSuccess,
            onSignout: handleSignout,
          },
        }}
      >
        <NeynarAuthButton />
      </NeynarContextProvider>
    </div>
  );
} 