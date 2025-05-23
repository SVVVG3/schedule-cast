'use client';

import { useEffect, useRef, useState } from 'react';
import { useUpdateAuthFromSIWN } from '@/lib/auth-context';

interface NeynarSignInButtonProps {
  onSuccess?: (data: {
    fid: number;
    signer_uuid: string;
    user?: {
      username?: string;
      displayName?: string;
    }
  }) => void;
  onError?: (error: Error) => void;
  theme?: 'light' | 'dark';
  clientId?: string; // Optional override for the client ID
  className?: string;
}

// Make the callback function globally accessible
declare global {
  interface Window {
    onNeynarSignInSuccess?: (data: any) => void;
  }
}

export default function NeynarSignInButton({
  onSuccess,
  onError,
  theme = 'light',
  clientId,
  className = ''
}: NeynarSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const callbackName = 'onNeynarSignInSuccess';
  // Use the hook from auth-context to update auth state
  const updateAuthFromSIWN = useUpdateAuthFromSIWN();
  
  // Set up the callback
  useEffect(() => {
    // Define global callback
    window[callbackName] = (data) => {
      console.log("Neynar sign-in success:", data);
      
      try {
        if (data.fid && data.signer_uuid) {
          // Update the auth context with the SIWN data
          updateAuthFromSIWN(data);
          
          // Store the signer in Supabase via API
          storeSignerInSupabase(data);
          
          // Call the onSuccess callback if provided
          onSuccess?.(data);
        } else {
          throw new Error('Invalid response from Neynar: missing fid or signer_uuid');
        }
      } catch (err) {
        console.error('Error processing Neynar sign-in:', err);
        onError?.(err as Error);
      }
    };
    
    return () => {
      // Clean up
      window[callbackName] = undefined;
    };
  }, [onSuccess, onError, updateAuthFromSIWN]);
  
  // Store the signer in Supabase
  const storeSignerInSupabase = async (data: any) => {
    try {
      if (data.fid && data.signer_uuid) {
        const response = await fetch('/api/signer/store', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fid: data.fid,
            signer_uuid: data.signer_uuid,
            username: data.user?.username,
            display_name: data.user?.displayName
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
      console.error('Unexpected error storing signer:', error);
    }
  };
  
  // Load script and create button
  useEffect(() => {
    // Add script if not already loaded
    if (!document.getElementById('neynar-siwn-script')) {
      const script = document.createElement('script');
      script.id = 'neynar-siwn-script';
      script.src = 'https://neynarxyz.github.io/siwn/raw/1.2.0/index.js';
      script.async = true;
      script.onload = () => setIsLoaded(true);
      document.body.appendChild(script);
    } else {
      setIsLoaded(true);
    }
  }, []);
  
  // Create button when script is loaded
  useEffect(() => {
    if (isLoaded && buttonRef.current) {
      // Clear any existing content
      buttonRef.current.innerHTML = '';
      
      const finalClientId = clientId || process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || 'a09909a7-0a8c-489c-a361-7c586dd0db35';
      console.log('Creating Neynar sign-in button with client ID:', finalClientId);
      
      // Create new button
      const button = document.createElement('div');
      button.className = 'neynar_signin';
      button.setAttribute('data-client_id', finalClientId);
      button.setAttribute('data-success-callback', callbackName);
      button.setAttribute('data-theme', theme);
      
      // Append button
      buttonRef.current.appendChild(button);
      
      console.log('Neynar sign-in button created and appended');
    }
  }, [isLoaded, theme, clientId]);
  
  return (
    <div className={className}>
      <div ref={buttonRef}>
        {!isLoaded && (
          <div className="flex items-center justify-center py-3 px-6 bg-purple-600 text-white rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Loading sign in...
          </div>
        )}
      </div>
    </div>
  );
} 