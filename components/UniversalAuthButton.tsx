'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useFrameContext } from '@/lib/frame-context';
import NeynarSignInButton from './NeynarSignInButton';

interface UniversalAuthButtonProps {
  className?: string;
}

export default function UniversalAuthButton({ className = '' }: UniversalAuthButtonProps) {
  const { user, isAuthenticated, signOut, signIn } = useAuth();
  const { isFrameApp, frameContext } = useFrameContext();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signIn();
      console.log('Authentication successful');
    } catch (error) {
      console.error('Authentication failed:', error);
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
            <div className="w-8 h-8 overflow-hidden rounded-full flex-shrink-0 border border-gray-600">
              <img
                src={user.avatar}
                alt={user.displayName || user.username || `User ${user.fid}`}
                className="w-full h-full object-cover"
                style={{ 
                  width: '32px !important', 
                  height: '32px !important',
                  maxWidth: '32px', 
                  maxHeight: '32px',
                  minWidth: '32px',
                  minHeight: '32px'
                }}
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
  // Always use Neynar SIWN for proper signer delegation, even in frame environment
  return (
    <div className={className}>
      <NeynarSignInButton theme="dark" />
    </div>
  );
} 