'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth-context';

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
          
          // Get the user from Supabase via API route with retry logic
          // This handles race conditions where auth completes before user is fully stored
          let dbUser = null;
          let attempts = 0;
          const maxAttempts = 5;
          
          while (attempts < maxAttempts && !dbUser) {
            attempts++;
            console.log(`[UserContext] Fetch attempt ${attempts}/${maxAttempts}`);
            
            const response = await fetch(`/api/auth/session?fid=${authUser.fid}`);
            const result = await response.json();
            
            if (result && result.fid) {
              dbUser = result;
              console.log('[UserContext] User found:', dbUser);
              break;
            } else {
              console.log(`[UserContext] User not found yet, retrying... (attempt ${attempts})`);
              if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
              }
            }
          }
          
          if (!dbUser) {
            console.warn('[UserContext] User not found after all retry attempts');
          }
          
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