'use client';

import { useState } from 'react';
import { useUpdateAuthFromSIWN } from '@/lib/auth-context';

interface MobileNeynarSignInProps {
  theme?: 'light' | 'dark';
  className?: string;
}

export default function MobileNeynarSignIn({
  theme = 'dark',
  className = ''
}: MobileNeynarSignInProps) {
  const [isLoading, setIsLoading] = useState(false);
  const updateAuthFromSIWN = useUpdateAuthFromSIWN();

  const handleSignIn = async () => {
    setIsLoading(true);
    
    try {
      const clientId = process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || '3bc04533-6297-438b-8d85-e655f3fc19f9';
      
      // For mobile users, redirect directly to Neynar auth page instead of using popup
      const redirectUrl = encodeURIComponent(window.location.origin + '/api/auth/neynar-mobile-callback');
      const authUrl = `https://app.neynar.com/login/authorize?` +
        `client_id=${clientId}&` +
        `response_type=code&` +
        `redirect_uri=${redirectUrl}&` +
        `state=siwn_mobile&` +
        `scope=read_write`;
      
      // Save current state for when we return
      sessionStorage.setItem('siwn_pending', 'true');
      
      // Redirect to Neynar auth page
      window.location.href = authUrl;
      
    } catch (error) {
      console.error('Error initiating sign-in:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className={className}>
      <button
        onClick={handleSignIn}
        disabled={isLoading}
        className={`
          inline-flex items-center justify-center px-6 py-3 border border-transparent 
          text-base font-medium rounded-md text-white 
          ${theme === 'dark' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'}
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-200
        `}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Connecting...
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Sign in with Neynar
          </>
        )}
      </button>
    </div>
  );
} 