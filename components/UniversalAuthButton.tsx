'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useFrameContext } from '@/lib/frame-context';
import NeynarSignInButton from './NeynarSignInButton';
import MobileNeynarSignIn from './MobileNeynarSignIn';

interface UniversalAuthButtonProps {
  className?: string;
}

export default function UniversalAuthButton({ className = '' }: UniversalAuthButtonProps) {
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const frameContext = useFrameContext();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile environment
    const checkMobile = () => {
      const userAgent = navigator.userAgent;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isFrameEnv = window.location.pathname.startsWith('/miniapp') || 
                        window.location.search.includes('miniApp=true') ||
                        window.parent !== window;
      
      return isMobileDevice || isFrameEnv;
    };

    setIsMobile(checkMobile());
  }, []);

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
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
              {user.displayName || user.username || `User ${user.fid}`}
            </span>
            {user.fid && (
              <span className="text-xs text-gray-400">FID {user.fid}</span>
            )}
          </div>
        </div>
        <button
          onClick={signOut}
          className="text-xs px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors duration-200"
        >
          Sign Out
        </button>
      </div>
    );
  }

  // Show appropriate sign-in method based on environment
  // Use mobile-friendly sign-in for mobile/frame environments
  if (isMobile) {
    return (
      <div className={className}>
        <MobileNeynarSignIn theme="dark" />
      </div>
    );
  }

  // Use regular SIWN for desktop
  return (
    <div className={className}>
      <NeynarSignInButton theme="dark" />
    </div>
  );
} 