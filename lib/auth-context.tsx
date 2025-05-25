'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useFrameContext } from './frame-context';

// Define the user type for the authentication context
interface AuthUser {
  fid: number;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  signer_uuid: string | null;
  delegated: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: () => void;
  signOut: () => void;
  updateAuthFromSIWN: (siwnData: any) => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  signIn: () => {},
  signOut: () => {},
  updateAuthFromSIWN: async () => {},
  refreshAuth: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Export this for SIWN button to use
export const useUpdateAuthFromSIWN = () => {
  const { updateAuthFromSIWN } = useAuth();
  return updateAuthFromSIWN;
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Get frame context
  const { isMiniApp, frameContext } = useFrameContext();
  
  // Helper function to fetch the user from Supabase via API route
  const fetchUserFromSupabase = async (fid: number): Promise<AuthUser | null> => {
    try {
      const response = await fetch(`/api/auth/session?fid=${fid}`);
      const data = await response.json();

      if (!response.ok || !data.fid) {
        console.log(`[AuthContext] User with FID ${fid} not found in database`);
        return null;
      }

      return {
        fid: data.fid,
        username: data.username,
        displayName: data.displayName,
        avatar: data.avatar,
        signer_uuid: data.signer_uuid,
        delegated: data.delegated || false,
      };
    } catch (error) {
      console.error('[AuthContext] Error fetching user from API:', error);
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      
      // Check if we're in a mini app environment with user context
      if (isMiniApp && frameContext?.user?.fid) {
        try {
          console.log('[AuthContext] Mini app user detected:', frameContext.user);
          
          // Check if this user exists in our database
          const userData = await fetchUserFromSupabase(frameContext.user.fid);
          if (userData) {
            // Merge frame context data with database data
            setUser({
              ...userData,
              username: frameContext.user.username || userData.username,
              displayName: frameContext.user.displayName || userData.displayName,
              avatar: frameContext.user.pfpUrl || userData.avatar,
            });
            setIsAuthenticated(true);
            console.log('[AuthContext] Mini app user authenticated:', userData);
          } else {
            // User from frame context but not in our database - they need to authenticate
            setIsAuthenticated(false);
            setUser(null);
            console.log('[AuthContext] Mini app user not in database, needs authentication');
          }
        } catch (error) {
          console.error('[AuthContext] Error checking mini app user:', error);
          setIsAuthenticated(false);
          setUser(null);
        }
      } else {
        // Regular web environment - check for SIWN session in localStorage
        try {
          if (typeof window !== 'undefined') {
            const storedAuthData = localStorage.getItem('siwn_auth_data');
            if (storedAuthData) {
              const siwnData = JSON.parse(storedAuthData);
              console.log('[AuthContext] Found stored SIWN data:', siwnData);
              
              // Fetch the latest user data from database
              if (siwnData.fid) {
                const userData = await fetchUserFromSupabase(siwnData.fid);
                if (userData) {
                  setUser({
                    ...userData,
                    avatar: siwnData.user?.pfp_url || userData.avatar,
                  });
                  setIsAuthenticated(true);
                  console.log('[AuthContext] Web user authenticated from localStorage:', userData);
                } else {
                  // Stored data but no user in database - clear invalid data
                  localStorage.removeItem('siwn_auth_data');
                  console.log('[AuthContext] Cleared invalid stored auth data');
                }
              }
            } else {
              console.log('[AuthContext] No stored auth data found');
            }
          }
        } catch (error) {
          console.error('[AuthContext] Error checking web session:', error);
          // Clear corrupted data
          if (typeof window !== 'undefined') {
            localStorage.removeItem('siwn_auth_data');
          }
        }
      }
      
      setIsLoading(false);
    };

    initializeAuth();
  }, [isMiniApp, frameContext]);

  // Helper function to refresh authentication state (useful after SIWN completion)
  const refreshAuth = async () => {
    console.log('[AuthContext] Refreshing authentication state...');
    setIsLoading(true);
    
    if (isMiniApp && frameContext?.user?.fid) {
      // In mini app, re-check database for updated user data
      const userData = await fetchUserFromSupabase(frameContext.user.fid);
      if (userData) {
        setUser({
          ...userData,
          username: frameContext.user.username || userData.username,
          displayName: frameContext.user.displayName || userData.displayName,
          avatar: frameContext.user.pfpUrl || userData.avatar,
        });
        setIsAuthenticated(true);
        console.log('[AuthContext] Mini app auth refreshed:', userData);
      }
    } else if (typeof window !== 'undefined') {
      // In web environment, check localStorage
      const storedAuthData = localStorage.getItem('siwn_auth_data');
      if (storedAuthData) {
        const siwnData = JSON.parse(storedAuthData);
        if (siwnData.fid) {
          const userData = await fetchUserFromSupabase(siwnData.fid);
          if (userData) {
            setUser({
              ...userData,
              avatar: siwnData.user?.pfp_url || userData.avatar,
            });
            setIsAuthenticated(true);
            console.log('[AuthContext] Web auth refreshed:', userData);
          }
        }
      }
    }
    
    setIsLoading(false);
  };

  const updateAuthFromSIWN = async (siwnData: any) => {
    console.log('[AuthContext] 🚀 UPDATING AUTH FROM SIWN DATA:', siwnData);
    console.log('[AuthContext] 🌍 Current environment - hostname:', typeof window !== 'undefined' ? window.location.hostname : 'server');
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('siwn_auth_data', JSON.stringify(siwnData));
      console.log('[AuthContext] 💾 STORED AUTH DATA IN LOCALSTORAGE:', localStorage.getItem('siwn_auth_data'));
    }
    
    // Immediately try to fetch user data and update state
    if (siwnData.fid) {
      console.log('[AuthContext] Immediately fetching user data for FID:', siwnData.fid);
      
      // Try multiple times with increasing delays to handle race conditions
      let attempts = 0;
      const maxAttempts = 5;
      
      const tryFetchUser = async () => {
        attempts++;
        console.log(`[AuthContext] Fetch attempt ${attempts}/${maxAttempts}`);
        
        try {
          const userData = await fetchUserFromSupabase(siwnData.fid);
          if (userData) {
            setUser({
              ...userData,
              avatar: siwnData.user?.pfp_url || userData.avatar,
            });
            setIsAuthenticated(true);
            console.log('[AuthContext] Auth state updated immediately:', userData);
            console.log('[AuthContext] Current auth state - isAuthenticated:', true, 'user:', userData);
            return true; // Success
          }
        } catch (error) {
          console.error(`[AuthContext] Attempt ${attempts} failed:`, error);
        }
        
        return false; // Failed
      };
      
      // Try immediately
      const success = await tryFetchUser();
      
      // If immediate attempt fails, retry with delays
      if (!success && attempts < maxAttempts) {
        const retryWithDelay = async (delay: number) => {
          await new Promise(resolve => setTimeout(resolve, delay));
          const success = await tryFetchUser();
          
          if (!success && attempts < maxAttempts) {
            // Exponential backoff: 500ms, 1s, 2s, 4s
            const nextDelay = delay * 2;
            if (nextDelay <= 4000) {
              return retryWithDelay(nextDelay);
            }
          }
        };
        
        retryWithDelay(500); // Start with 500ms delay
      }
    }
  };

  const signIn = () => {
    // For mini apps, this will be handled by the MiniAppAuth component
    // For web, this will be handled by the SIWN button
    console.log('[AuthContext] Sign in requested');
  };

  const signOut = () => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('siwn_auth_data');
    }
    
    console.log('[AuthContext] User signed out');
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    signIn,
    signOut,
    updateAuthFromSIWN,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 