'use client';

import { useAuth } from '@/lib/auth-context';
import { useFrameContext } from '@/lib/frame-context';
import NeynarSignInButton from './NeynarSignInButton';
import { useState } from 'react';

interface UniversalAuthButtonProps {
  className?: string;
}

export default function UniversalAuthButton({ className = '' }: UniversalAuthButtonProps) {
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const { isFrameApp, frameContext } = useFrameContext();
  const [needsSignerDelegation, setNeedsSignerDelegation] = useState(false);

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  if (isAuthenticated && user) {
    // Check if user needs signer delegation for cast permissions
    const needsSigner = !user.signer_uuid || !user.delegated;
    
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
            <NeynarSignInButton 
              theme="dark" 
              className="w-full"
              showAsSignerDelegation={true}
            />
          </div>
        )}
      </div>
    );
  }

  // Handle Frame environment - user context available but not authenticated in our system
  if (isFrameApp && frameContext?.user?.fid) {
    return (
      <div className={`flex flex-col space-y-2 ${className}`}>
        <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-3">
          <p className="text-sm text-blue-200 mb-2">
            Welcome! To use Schedule-Cast, please sign in to grant posting permissions:
          </p>
          <NeynarSignInButton 
            theme="dark" 
            className="w-full"
            frameUserFid={frameContext.user.fid}
          />
        </div>
      </div>
    );
  }

  // Standard web environment - use SIWN for both auth and signer delegation
  return (
    <div className={className}>
      <NeynarSignInButton theme="dark" />
    </div>
  );
} 