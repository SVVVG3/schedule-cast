'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';

// Detect if we're running in Farcaster's Warpcast mini app environment
const isFarcasterApp = () => {
  if (typeof window === 'undefined') return false;
  
  // Check if we're running in a Farcaster frame
  const isInFrame = window.self !== window.top;
  
  // Check for Farcaster app-specific indicators
  const urlParams = new URLSearchParams(window.location.search);
  const hasFarcasterParam = urlParams.has('fc-frame');
  
  return isInFrame || hasFarcasterParam;
};

export function PrivyProviderWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  
  // Get Privy App ID from environment variable
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';
  
  if (!privyAppId) {
    console.warn('NEXT_PUBLIC_PRIVY_APP_ID is not set. Authentication will not work correctly.');
  }
  
  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ['farcaster'],
        appearance: {
          theme: 'light',
          accentColor: '#8b5cf6',
          logo: '/logo.png',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
} 