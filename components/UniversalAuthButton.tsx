'use client';

import { useAuth } from '@/lib/auth-context';
import { useFrameContext } from '@/lib/frame-context';
import { NeynarAuthButton } from '@neynar/react';
import MiniAppAuth from './MiniAppAuth';
import { useState, useEffect } from 'react';

interface UniversalAuthButtonProps {
  className?: string;
}

export default function UniversalAuthButton({ className = '' }: UniversalAuthButtonProps) {
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const { isMiniApp, frameContext } = useFrameContext();
  const [needsSigner, setNeedsSigner] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  
  console.log('[UniversalAuthButton] State debug:', {
    isAuthenticated,
    user: user ? { fid: user.fid, hasSignerUuid: !!user.signer_uuid } : null,
    isMiniApp,
    frameContext: frameContext ? { userFid: frameContext.user?.fid } : null
  });

  // Loading state
  if (isLoading) {
    console.log('[UniversalAuthButton] Rendering loading state');
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
        <span className="ml-2 text-gray-400">Loading...</span>
      </div>
    );
  }

  // Authenticated user with complete setup
  if (isAuthenticated && user) {
    console.log('[UniversalAuthButton] User is authenticated, checking signer needs');
    
    // Check if user needs a signer
    const needsSigner = !user.signer_uuid;
    console.log('[UniversalAuthButton] User needs signer:', needsSigner);

    const handleSignOut = async () => {
      setIsSigningOut(true);
      try {
        await signOut();
      } finally {
        setIsSigningOut(false);
      }
    };

    return (
      <div className={`space-y-3 ${className}`}>
        {/* User Info */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {user.avatar && (
              <div className="w-8 h-8 overflow-hidden rounded-full flex-shrink-0 border border-gray-600">
                <img
                  src={user.avatar}
                  alt={user.displayName || user.username || `User ${user.fid}`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <span className="text-sm font-medium text-white truncate">
              {user.displayName || user.username || `User ${user.fid}`}
            </span>
          </div>
          
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition duration-150 disabled:opacity-50"
          >
            {isSigningOut ? '...' : 'Sign Out'}
          </button>
        </div>

        {/* Signer delegation prompt */}
        {needsSigner && (
          <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-3">
            <p className="text-sm text-yellow-200 mb-2">
              To schedule casts, you need to grant posting permissions:
            </p>
            {isMiniApp ? (
              <MiniAppAuth className="w-full" />
            ) : (
              <NeynarAuthButton 
                label="Grant Posting Permissions"
              />
            )}
          </div>
        )}
      </div>
    );
  }

  // Handle Mini App environment - user context available but not authenticated in our system
  if (isMiniApp && frameContext?.user?.fid) {
    console.log('[UniversalAuthButton] Rendering mini app auth for frame user:', frameContext.user.fid);
    return (
      <div className={`flex flex-col space-y-2 ${className}`}>
        <MiniAppAuth />
      </div>
    );
  }

  // Standard web environment - use SIWN for both auth and signer delegation
  console.log('[UniversalAuthButton] Rendering standard SIWN button for web environment');
  return (
    <div className={className}>
      <NeynarAuthButton 
        label="Sign in with Neynar"
      />
    </div>
  );
} 