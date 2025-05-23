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
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isButtonCreated, setIsButtonCreated] = useState(false);
  const callbackName = 'onNeynarSignInSuccess';
  
  // Use the hook from auth-context to update auth state
  const updateAuthFromSIWN = useUpdateAuthFromSIWN();
  
  // Set up the callback function
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
      if (window[callbackName]) {
        window[callbackName] = undefined;
      }
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
  
  // Load the Neynar SIWN script
  useEffect(() => {
    const scriptId = 'neynar-siwn-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://neynarxyz.github.io/siwn/raw/1.2.0/index.js';
      script.async = true;
      
      script.onload = () => {
        console.log('Neynar SIWN script loaded successfully');
        setIsScriptLoaded(true);
      };
      
      script.onerror = () => {
        console.error('Failed to load Neynar SIWN script');
        setIsScriptLoaded(false);
      };
      
      document.head.appendChild(script);
    } else {
      // Script already exists, check if it's loaded
      setIsScriptLoaded(true);
    }
  }, []);
  
  // Create the SIWN button once script is loaded
  useEffect(() => {
    if (isScriptLoaded && buttonRef.current && !isButtonCreated) {
      try {
        // Clear any existing content
        buttonRef.current.innerHTML = '';
        
        const finalClientId = clientId || 
                             process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || 
                             '3bc04533-6297-438b-8d85-e655f3fc19f9';
        
        console.log('Creating Neynar sign-in button with client ID:', finalClientId);
        
        // Create the div with the neynar_signin class
        const signInDiv = document.createElement('div');
        signInDiv.className = 'neynar_signin';
        signInDiv.setAttribute('data-client_id', finalClientId);
        signInDiv.setAttribute('data-success-callback', callbackName);
        signInDiv.setAttribute('data-theme', theme);
        
        // Optional: Add more customization attributes based on Neynar docs
        signInDiv.setAttribute('data-variant', 'neynar');
        signInDiv.setAttribute('data-width', '100%');
        signInDiv.setAttribute('data-height', '48px');
        signInDiv.setAttribute('data-border_radius', '8px');
        
        buttonRef.current.appendChild(signInDiv);
        setIsButtonCreated(true);
        
        console.log('Neynar sign-in button element created and appended');
        
        // Force a re-render of the Neynar widget if the script is already loaded
        setTimeout(() => {
          if (window.NeynarSignIn && typeof window.NeynarSignIn.init === 'function') {
            window.NeynarSignIn.init();
          }
        }, 100);
        
      } catch (error) {
        console.error('Error creating Neynar sign-in button:', error);
      }
    }
  }, [isScriptLoaded, theme, clientId, isButtonCreated]);
  
  return (
    <div className={className}>
      <div ref={buttonRef} style={{ minHeight: '48px' }}>
        {!isScriptLoaded && (
          <div className="flex items-center justify-center py-3 px-6 bg-purple-600 text-white rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Loading sign in...
          </div>
        )}
        {isScriptLoaded && !isButtonCreated && (
          <div className="flex items-center justify-center py-3 px-6 bg-purple-600 text-white rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Initializing...
          </div>
        )}
      </div>
      
      {/* Fallback button if Neynar widget doesn't render */}
      {isScriptLoaded && isButtonCreated && (
        <div className="mt-2">
          <button 
            onClick={() => {
              const finalClientId = clientId || 
                                   process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || 
                                   '3bc04533-6297-438b-8d85-e655f3fc19f9';
              const signInUrl = `https://app.neynar.com/login?client_id=${finalClientId}&redirect_uri=${encodeURIComponent(window.location.origin)}&response_type=code&scope=signer`;
              window.location.href = signInUrl;
            }}
            className="w-full flex items-center justify-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all duration-200"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            </svg>
            Sign in with Farcaster (Backup)
          </button>
        </div>
      )}
    </div>
  );
}

// Extend the Window interface to include NeynarSignIn
declare global {
  interface Window {
    NeynarSignIn?: {
      init: () => void;
    };
  }
} 