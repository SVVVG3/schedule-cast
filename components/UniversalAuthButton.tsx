'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useFrameContext } from '@/lib/frame-context';
import NeynarSignInButton from './NeynarSignInButton';

interface UniversalAuthButtonProps {
  className?: string;
}

export default function UniversalAuthButton({ className = '' }: UniversalAuthButtonProps) {
  const { user, isAuthenticated, signOut } = useAuth();
  const { isFrameApp, frameContext, signIn: frameSignIn } = useFrameContext();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleFrameSignIn = async () => {
    if (!isFrameApp) return;
    
    setIsSigningIn(true);
    try {
      const result = await frameSignIn();
      console.log('Frame authentication successful:', result);
      // Handle the authentication result...
      // This would typically update the auth context
    } catch (error) {
      console.error('Frame authentication failed:', error);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  // If user is authenticated, show user info and sign out
  if (isAuthenticated && user) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          {user.avatar && (
            <div className="w-5 h-5 overflow-hidden rounded-full flex-shrink-0 border border-gray-600">
              <img
                src={user.avatar}
                alt={user.displayName || user.username || `User ${user.fid}`}
                className="w-full h-full object-cover"
                style={{ maxWidth: '40px', maxHeight: '40px' }}
              />
            </div>
          )}
          <span className="text-xs font-medium truncate max-w-[200px]">
            {user.displayName || user.username || `User ${user.fid}`}
          </span>
        </div>
        
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className={`px-2 py-1 text-xs font-medium text-white bg-purple-600 rounded hover:bg-purple-700 transition duration-150 disabled:opacity-50 ${className}`}
        >
          {isSigningOut ? '...' : 'Sign Out'}
        </button>
      </div>
    );
  }

  // Show appropriate sign-in method based on environment
  if (isFrameApp) {
    return (
      <button
        onClick={handleFrameSignIn}
        disabled={isSigningIn}
        className={`px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition duration-150 disabled:opacity-50 flex items-center space-x-2 ${className}`}
      >
        {isSigningIn ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Signing in...</span>
          </>
        ) : (
          <span>Sign in with Farcaster</span>
        )}
      </button>
    );
  }

  // Fallback to Neynar SIWN for web
  return (
    <div className={className}>
      <NeynarSignInButton theme="dark" />
    </div>
  );
} 