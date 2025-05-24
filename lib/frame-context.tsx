'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Types for Frame SDK (these will be available when SDK loads)
interface FrameContext {
  user: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
  client: {
    clientFid: number;
    added: boolean;
    safeAreaInsets?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  };
  location?: any;
}

interface FrameContextState {
  isFrameApp: boolean;
  isMiniApp: boolean;
  frameContext: FrameContext | null;
  isLoading: boolean;
  sdk: any | null;
  signIn: () => Promise<any>;
  ready: () => Promise<void>;
}

const FrameContextContext = createContext<FrameContextState>({
  isFrameApp: false,
  isMiniApp: false,
  frameContext: null,
  isLoading: true,
  sdk: null,
  signIn: async () => {},
  ready: async () => {},
});

export const useFrameContext = () => useContext(FrameContextContext);

interface FrameContextProviderProps {
  children: ReactNode;
}

export function FrameContextProvider({ children }: FrameContextProviderProps) {
  const [isFrameApp, setIsFrameApp] = useState(false);
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [frameContext, setFrameContext] = useState<FrameContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sdk, setSdk] = useState<any>(null);

  useEffect(() => {
    const initializeFrameSDK = async () => {
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }

      try {
        console.log('[FrameContext] Initializing Frame SDK...');
        
        // Dynamic import of Frame SDK
        const { sdk: frameSdk } = await import('@farcaster/frame-sdk');
        setSdk(frameSdk);
        
        // Proper mini app detection using official SDK method
        const isMiniAppEnv = await frameSdk.isInMiniApp();
        setIsMiniApp(isMiniAppEnv);
        
        console.log('[FrameContext] Mini app detection result:', isMiniAppEnv);
        
        if (isMiniAppEnv) {
          // We're in a mini app - get user context
          console.log('[FrameContext] In mini app environment, getting context...');
          
          const context = await frameSdk.context;
          console.log('[FrameContext] Frame context:', context);
          
          if (context?.user) {
            setFrameContext(context);
            setIsFrameApp(true);
            console.log('[FrameContext] User context loaded:', context.user);
          }
          
          // Signal ready to Farcaster client
          await frameSdk.actions.ready();
          console.log('[FrameContext] Frame SDK ready signal sent');
        } else {
          console.log('[FrameContext] Not in mini app environment');
        }
        
      } catch (error) {
        console.error('[FrameContext] Error initializing Frame SDK:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeFrameSDK();
  }, []);

  const signIn = async () => {
    if (!sdk) {
      throw new Error('Frame SDK not initialized');
    }
    
    console.log('[FrameContext] Initiating Frame SDK sign-in...');
    return await sdk.actions.signIn();
  };

  const ready = async () => {
    if (!sdk) {
      console.warn('[FrameContext] SDK not available for ready signal');
      return;
    }
    
    console.log('[FrameContext] Sending ready signal...');
    await sdk.actions.ready();
  };

  const value: FrameContextState = {
    isFrameApp,
    isMiniApp,
    frameContext,
    isLoading,
    sdk,
    signIn,
    ready,
  };

  return (
    <FrameContextContext.Provider value={value}>
      {children}
    </FrameContextContext.Provider>
  );
} 