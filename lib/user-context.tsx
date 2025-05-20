'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth-context';
import { getUserByFid } from './user-service';

// Define the user context type
interface UserContextType {
  isLoading: boolean;
  supabaseUser: any | null;
}

// Create the context
const UserContext = createContext<UserContextType>({
  isLoading: true,
  supabaseUser: null,
});

// Hook to use the user context
export const useUser = () => useContext(UserContext);

// Provider component
export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth();
  const [supabaseUser, setSupabaseUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync auth user to Supabase when authenticated
  useEffect(() => {
    if (authLoading) return;

    console.log('[UserContext] Auth state:', { 
      authLoading, 
      isAuthenticated, 
      authUser: authUser ? {
        fid: authUser.fid,
        username: authUser.username
      } : null
    });

    async function syncUser() {
      if (isAuthenticated && authUser && authUser.fid) {
        try {
          setIsLoading(true);
          console.log('[UserContext] Getting user from Supabase:', {
            fid: authUser.fid,
            username: authUser.username
          });
          
          // Get the user from Supabase - we don't need to sync since the SIWN flow
          // already ensures user exists in Supabase
          const dbUser = await getUserByFid(authUser.fid);
          console.log('[UserContext] Supabase user result:', dbUser);
          
          setSupabaseUser(dbUser);
        } catch (error) {
          console.error('[UserContext] Error getting user:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Not authenticated or no FID info
        console.log('[UserContext] Not getting user: not authenticated or no FID info');
        setSupabaseUser(null);
        setIsLoading(false);
      }
    }

    syncUser();
  }, [authUser, authLoading, isAuthenticated]);

  // Provide the user context to children
  return (
    <UserContext.Provider value={{ isLoading, supabaseUser }}>
      {children}
    </UserContext.Provider>
  );
} 