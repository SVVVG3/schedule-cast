'use client';

import { NeynarContextProvider, Theme } from '@neynar/react';

interface NeynarProviderProps {
  children: React.ReactNode;
}

export default function NeynarProvider({ children }: NeynarProviderProps) {
  return (
    <NeynarContextProvider
      settings={{
        clientId: process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || '3bc04533-6297-438b-8d85-e655f3fc19f9',
        defaultTheme: Theme.Dark,
        eventsCallbacks: {
          onAuthSuccess: () => {
            console.log('Neynar auth success');
          },
          onSignout: () => {
            console.log('Neynar signout');
          },
        },
      }}
    >
      {children}
    </NeynarContextProvider>
  );
} 