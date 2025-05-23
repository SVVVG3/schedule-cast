'use client';

import { useState } from 'react';

interface CustomSignInButtonProps {
  className?: string;
}

export default function CustomSignInButton({ className = '' }: CustomSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = () => {
    setIsLoading(true);
    
    // Open Neynar sign-in URL directly
    const clientId = '3bc04533-6297-438b-8d85-e655f3fc19f9';
    const signInUrl = `https://app.neynar.com/login?client_id=${clientId}&redirect_uri=${encodeURIComponent(window.location.origin)}&response_type=code&scope=signer`;
    
    // Open in same window
    window.location.href = signInUrl;
  };

  return (
    <button
      onClick={handleSignIn}
      disabled={isLoading}
      className={`w-full flex items-center justify-center px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
        isLoading 
          ? 'bg-gray-500 cursor-not-allowed' 
          : 'bg-purple-600 hover:bg-purple-700 hover:shadow-lg'
      } ${className}`}
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
          Connecting to Farcaster...
        </>
      ) : (
        <>
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.5 9.5c0-.8-.7-1.5-1.5-1.5h-3V6c0-3.3-2.7-6-6-6H6C2.7 0 0 2.7 0 6v2H0c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5h22c.8 0 1.5-.7 1.5-1.5z"/>
            <path d="M22 12H2c-.6 0-1 .4-1 1v8c0 1.7 1.3 3 3 3h16c1.7 0 3-1.3 3-3v-8c0-.6-.4-1-1-1z"/>
          </svg>
          Sign in with Farcaster
        </>
      )}
    </button>
  );
} 