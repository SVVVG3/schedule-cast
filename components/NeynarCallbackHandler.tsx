'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUpdateAuthFromSIWN } from '@/lib/auth-context';

export default function NeynarCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const updateAuthFromSIWN = useUpdateAuthFromSIWN();
  
  useEffect(() => {
    const handleNeynarCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      
      if (code) {
        console.log('Received Neynar auth code, processing...');
        
        try {
          // Call our API to exchange the code for user data
          const response = await fetch('/api/auth/neynar-callback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code, state }),
          });
          
          const data = await response.json();
          
          if (data.success) {
            console.log('Neynar auth successful:', data);
            await updateAuthFromSIWN(data);
            
            // Clear the URL parameters
            router.replace('/');
          } else {
            console.error('Neynar auth failed:', data.error);
          }
        } catch (error) {
          console.error('Error processing Neynar callback:', error);
        }
      }
    };
    
    handleNeynarCallback();
  }, [searchParams, updateAuthFromSIWN, router]);
  
  return null; // This component doesn't render anything
} 