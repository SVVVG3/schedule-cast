'use client';

import { NeynarContextProvider, Theme, useNeynarContext } from '@neynar/react';
import { useUpdateAuthFromSIWN, useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';

interface NeynarProviderProps {
  children: React.ReactNode;
}

function NeynarAuthIntegration({ children }: { children: React.ReactNode }) {
  const { user } = useNeynarContext();
  const updateAuthFromSIWN = useUpdateAuthFromSIWN();
  const auth = useAuth();
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    if (user && user.fid && user.signer_uuid && !hasProcessed) {
      console.log('Neynar auth success detected, storing user data:', user);
      
      const storeUserAndUpdateAuth = async () => {
        try {
          // First store the user data in our Supabase database
          console.log('Storing Neynar user in our database...');
          const storeResponse = await fetch('/api/auth/store-neynar-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fid: user.fid,
              username: user.username,
              display_name: user.display_name,
              pfp_url: user.pfp_url,
              signer_uuid: user.signer_uuid
            }),
          });

          if (!storeResponse.ok) {
            throw new Error(`Failed to store user: ${storeResponse.status}`);
          }

          const storeResult = await storeResponse.json();
          console.log('User stored successfully:', storeResult);

          // Now update our auth context with the stored data
          const authData = {
            fid: user.fid,
            signer_uuid: user.signer_uuid,
            user: {
              username: user.username,
              display_name: user.display_name,
              pfp_url: user.pfp_url
            }
          };

          console.log('Updating auth context with:', authData);
          
          try {
            console.log('📞 About to call updateAuthFromSIWN...');
            await updateAuthFromSIWN(authData);
            console.log('✅ updateAuthFromSIWN completed successfully');
            
            // BYPASS BROKEN AUTH-CONTEXT: Set auth state directly here
            console.log('🚀 BYPASS: Setting auth state directly in NeynarProvider');
            
            // Store in localStorage
            if (typeof window !== 'undefined') {
              localStorage.setItem('siwn_auth_data', JSON.stringify(authData));
              console.log('🚀 Stored auth data in localStorage');
            }
            
            // Navigate to dashboard without page reload
            setTimeout(() => {
              console.log('🚀 Navigating to dashboard...');
              window.location.href = '/dashboard';
            }, 500);
            
          } catch (error) {
            console.error('❌ updateAuthFromSIWN failed:', error);
            console.error('❌ Error details:', {
              message: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : 'No stack trace'
            });
          }
          
          console.log('✅ Neynar integration completed successfully');
          setHasProcessed(true);
        } catch (error) {
          console.error('❌ Failed to complete Neynar integration:', error);
          // Don't set hasProcessed on error so it can retry
        }
      };

      storeUserAndUpdateAuth();
    }
  }, [user, updateAuthFromSIWN, hasProcessed]);

  return <>{children}</>;
}

export default function NeynarProvider({ children }: NeynarProviderProps) {
  return (
    <NeynarContextProvider
      settings={{
        clientId: process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || '3bc04533-6297-438b-8d85-e655f3fc19f9',
        defaultTheme: Theme.Dark,
        eventsCallbacks: {
          onAuthSuccess: () => {
            console.log('Neynar auth success callback triggered');
          },
          onSignout: () => {
            console.log('Neynar signout callback triggered');
          },
        },
      }}
    >
      <NeynarAuthIntegration>
        {children}
      </NeynarAuthIntegration>
    </NeynarContextProvider>
  );
} 