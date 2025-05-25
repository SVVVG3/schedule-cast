'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { NeynarAuthButton } from '@neynar/react';

interface AuthButtonProps {
  className?: string;
}

export default function AuthButton({ className = '' }: AuthButtonProps) {
  const { user, isAuthenticated, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  
  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };
  
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
          <span className="text-xs font-medium truncate max-w-[200px]">{user.displayName || user.username || `User ${user.fid}`}</span>
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
  
  return (
    <div className="flex items-center">
      <NeynarAuthButton 
        label="Sign in with Neynar"
      />
    </div>
  );
} 