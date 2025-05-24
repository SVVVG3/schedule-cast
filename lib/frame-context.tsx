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
  frameContext: FrameContext | null;
  isLoading: boolean;
  sdk: any | null;
  signIn: () => Promise<any>;
  ready: () => Promise<void>;
}

const FrameContextContext = createContext<FrameContextState>({
  isFrameApp: false,
  frameContext: null,
  isLoading: true,
  sdk: null,
  signIn: async () => null,
  ready: async () => {},
});

export function useFrameContext() {
  return useContext(FrameContextContext);
}

interface FrameContextProviderProps {
  children: ReactNode;
}

export function FrameContextProvider({ children }: FrameContextProviderProps) {
  const [isFrameApp, setIsFrameApp] = useState(false);
  const [frameContext, setFrameContext] = useState<FrameContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sdk, setSdk] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    async function initializeFrameSDK() {
      try {
        // Detect if we're in a frame environment
        const isMiniApp = 
          window.location.pathname.startsWith('/miniapp') ||
          window.location.search.includes('miniApp=true') ||
          window.parent !== window; // Basic iframe detection

        console.log('Frame environment detection:', { isMiniApp, pathname: window.location.pathname, search: window.location.search });

        if (isMiniApp) {
          // Dynamically import the Frame SDK
          const { sdk: frameSDK } = await import('@farcaster/frame-sdk');
          
          if (mounted) {
            console.log('Frame SDK loaded, initializing...');
            setSdk(frameSDK);
            setIsFrameApp(true);

            // Get frame context
            if (frameSDK.context) {
              const context = await frameSDK.context;
              console.log('Frame context available:', context);
              setFrameContext(context);
            }

            // Call ready to indicate the app is loaded
            await frameSDK.actions.ready();
            console.log('Frame SDK ready() called');
          }
        } else {
          console.log('Not in frame environment, using regular web mode');
          setIsFrameApp(false);
        }
      } catch (error) {
        console.error('Error initializing Frame SDK:', error);
        setIsFrameApp(false);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initializeFrameSDK();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async () => {
    if (!sdk || !isFrameApp) {
      throw new Error('Frame SDK not available for sign-in');
    }

    try {
      const nonce = Date.now().toString();
      const result = await sdk.actions.signIn({ nonce });
      console.log('Frame sign-in result:', result);
      return result;
    } catch (error) {
      console.error('Frame sign-in error:', error);
      throw error;
    }
  };

  const ready = async () => {
    if (sdk && isFrameApp) {
      await sdk.actions.ready();
    }
  };

  const value: FrameContextState = {
    isFrameApp,
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