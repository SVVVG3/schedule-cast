'use client';

import { useEffect } from 'react';
import { useFrameContext } from '@/lib/frame-context';
import { useUpdateAuthFromSIWN } from '@/lib/auth-context';

/**
 * Component that automatically authenticates users when they're in a Farcaster mini app
 * environment where user context is automatically available through the Frame SDK.
 */
export default function FrameAutoAuth() {
  const { isFrameApp, frameContext, isLoading } = useFrameContext();
  const updateAuthFromSIWN = useUpdateAuthFromSIWN();

  useEffect(() => {
    if (!isLoading && isFrameApp && frameContext?.user?.fid) {
      const autoAuthenticate = async () => {
        try {
          console.log('Auto-authenticating user from Frame context:', {
            fid: frameContext.user.fid,
            username: frameContext.user.username,
            displayName: frameContext.user.displayName
          });

          // Create a mock SIWN response using Frame context data
          const mockSIWNResponse = {
            fid: frameContext.user.fid,
            username: frameContext.user.username || `fid-${frameContext.user.fid}`,
            displayName: frameContext.user.displayName || frameContext.user.username || `User ${frameContext.user.fid}`,
            pfpUrl: frameContext.user.pfpUrl,
            // Since we're in a frame environment, we don't need a traditional signature
            // The frame context itself validates the user's identity
            isFrameAuthenticated: true,
            frameContext: frameContext
          };

          // Update the auth context with the frame user data
          await updateAuthFromSIWN(mockSIWNResponse);
          
          console.log('✅ Frame auto-authentication completed successfully');
        } catch (error) {
          console.error('❌ Frame auto-authentication failed:', error);
        }
      };

      autoAuthenticate();
    }
  }, [isLoading, isFrameApp, frameContext, updateAuthFromSIWN]);

  // This component doesn't render anything visible
  return null;
} 