'use client';

import { useAuth } from '@/lib/auth-context';
import { useFrameContext } from '@/lib/frame-context';
import NeynarSignInButton from './NeynarSignInButton';
import MiniAppAuth from './MiniAppAuth';
import { useState, useEffect } from 'react';

interface UniversalAuthButtonProps {
  className?: string;
}

export default function UniversalAuthButton({ className = '' }: UniversalAuthButtonProps) {
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const { isFrameApp, isMiniApp, frameContext } = useFrameContext();

  // Add debugging to understand the routing logic
  useEffect(() => {
    console.log('[UniversalAuthButton] State debug:', {
      isLoading,
      isAuthenticated,
      user: user ? { fid: user.fid, signer_uuid: user.signer_uuid, delegated: user.delegated } : null,
      isMiniApp,
      isFrameApp,
      frameContext: frameContext ? { userFid: frameContext.user?.fid } : null
    });
  }, [isLoading, isAuthenticated, user, isMiniApp, isFrameApp, frameContext]);

  if (isLoading) {
    console.log('[UniversalAuthButton] Rendering loading state');
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  if (isAuthenticated && user) {
    console.log('[UniversalAuthButton] User is authenticated, checking signer needs');
    // Check if user needs signer delegation for cast permissions
    const needsSigner = !user.signer_uuid || !user.delegated;
    console.log('[UniversalAuthButton] User needs signer:', needsSigner);
    
    return (
      <div className={`flex flex-col space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
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
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">
                Signed in as {user.displayName || user.username || `User ${user.fid}`}
              </span>
              <span className="text-xs text-gray-400">FID {user.fid}</span>
            </div>
          </div>
          <button
            onClick={signOut}
            className="text-xs px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors duration-200"
          >
            Sign Out
          </button>
        </div>
        
        {/* Show signer delegation prompt if needed */}
        {needsSigner && (
          <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-3">
            <p className="text-sm text-yellow-200 mb-2">
              To schedule casts, you need to grant posting permissions:
            </p>
            {isMiniApp ? (
              <MiniAppAuth className="w-full" />
            ) : (
              <NeynarSignInButton 
                theme="dark" 
                className="w-full"
                showAsSignerDelegation={true}
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
      <NeynarSignInButton theme="dark" />
    </div>
  );
} 