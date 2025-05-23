'use client';

import { useState } from 'react';

interface NeynarSignInButtonProps {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  theme?: 'light' | 'dark';
  clientId?: string;
  className?: string;
}

export default function NeynarSignInButton({
  onSuccess,
  onError,
  theme = 'light',
  clientId,
  className = ''
}: NeynarSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = () => {
    setIsLoading(true);
    
    const finalClientId = clientId || 
                         process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || 
                         '3bc04533-6297-438b-8d85-e655f3fc19f9';
    
    const redirectUri = encodeURIComponent(window.location.origin);
    const signInUrl = `https://app.neynar.com/login?client_id=${finalClientId}&redirect_uri=${redirectUri}&response_type=code&scope=signer`;
    
    console.log('Redirecting to Neynar sign-in:', signInUrl);
    
    // Direct redirect - much simpler than widget approach
    window.location.href = signInUrl;
  };

  const buttonStyle = theme === 'dark' 
    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
    : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300';

  return (
    <button
      onClick={handleSignIn}
      disabled={isLoading}
      className={`w-full flex items-center justify-center px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${buttonStyle} ${
        isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'
      } ${className}`}
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
          Redirecting to Farcaster...
        </>
      ) : (
        <>
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
          </svg>
          Sign in with Farcaster
        </>
      )}
    </button>
  );
} 