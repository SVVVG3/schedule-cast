'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabase';

// Define the user type for the authentication context
interface AuthUser {
  fid: number;
  username?: string;
  displayName?: string;
  avatar?: string;
  signer_uuid?: string;
  delegated?: boolean;
}

// Define the auth context type
interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  signIn: async () => {},
  signOut: async () => {},
  refreshUser: async () => {},
});

// Hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Authentication provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Helper function to fetch the user from Supabase
  const fetchUserFromSupabase = async (fid: number) => {
    try {
      console.log(`[AuthContext] Fetching user with FID: ${fid}, type: ${typeof fid}`);
      
      // Ensure FID is treated as a number
      const numericFid = typeof fid === 'string' ? parseInt(fid, 10) : fid;
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('fid', numericFid)
        .maybeSingle();
      
      if (error) {
        console.error('[AuthContext] Error fetching user from Supabase:', error);
        return null;
      }
      
      console.log('[AuthContext] Fetch result:', data ? 'User found' : 'No user found');
      return data;
    } catch (error) {
      console.error('[AuthContext] Unexpected error fetching user:', error);
      return null;
    }
  };
  
  // Initialize the auth state on component mount
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      
      // Check for SIWN auth data in localStorage
      const siwnData = localStorage.getItem('siwn_auth_data');
      
      if (siwnData) {
        try {
          const parsedData = JSON.parse(siwnData);
          
          if (parsedData.fid) {
            // Fetch the latest user data from Supabase
            const userData = await fetchUserFromSupabase(parsedData.fid);
            
            if (userData) {
              setUser({
                fid: userData.fid,
                username: userData.username,
                displayName: userData.display_name,
                avatar: parsedData.user?.pfp_url, // Use the avatar from SIWN data
                signer_uuid: userData.signer_uuid,
                delegated: userData.delegated,
              });
            }
          }
        } catch (error) {
          console.error('[AuthContext] Error parsing stored auth data:', error);
          localStorage.removeItem('siwn_auth_data');
        }
      }
      
      setIsLoading(false);
    };
    
    initializeAuth();
  }, []);
  
  // Sign in function - this is mostly a placeholder since the actual sign-in
  // happens through the NeynarSignInButton component
  const signIn = async () => {
    // We don't need to do anything here - the NeynarSignInButton component
    // handles the sign-in flow and updates the auth state
    console.log('[AuthContext] Sign in initiated');
  };
  
  // Sign out function
  const signOut = async () => {
    // Clear the auth data from localStorage
    localStorage.removeItem('siwn_auth_data');
    
    // Clear the user state
    setUser(null);
    
    console.log('[AuthContext] User signed out');
  };
  
  // Refresh user data from Supabase
  const refreshUser = async () => {
    if (user?.fid) {
      const userData = await fetchUserFromSupabase(user.fid);
      
      if (userData) {
        setUser({
          ...user,
          username: userData.username,
          displayName: userData.display_name,
          signer_uuid: userData.signer_uuid,
          delegated: userData.delegated,
        });
      }
    }
  };
  
  // Update function for SIWN auth data
  // This will be called by the NeynarSignInButton component after successful sign-in
  const updateAuthFromSIWN = async (data: any) => {
    try {
      if (!data || !data.fid) {
        console.error('[AuthContext] Invalid SIWN data:', data);
        return;
      }
      
      // Store the SIWN data in localStorage
      localStorage.setItem('siwn_auth_data', JSON.stringify(data));
      
      // Fetch the latest user data from Supabase
      const userData = await fetchUserFromSupabase(data.fid);
      
      if (userData) {
        setUser({
          fid: userData.fid,
          username: userData.username || data.user?.username,
          displayName: userData.display_name || data.user?.displayName,
          avatar: data.user?.pfp_url,
          signer_uuid: userData.signer_uuid,
          delegated: userData.delegated,
        });
      } else {
        // If user doesn't exist in Supabase yet, use the SIWN data
        // The API endpoint will handle creating/updating the user in Supabase
        setUser({
          fid: data.fid,
          username: data.user?.username,
          displayName: data.user?.displayName,
          avatar: data.user?.pfp_url,
          signer_uuid: data.signer_uuid,
          delegated: true, // SIWN signers are already delegated
        });
      }
      
      console.log('[AuthContext] User authenticated via SIWN:', data.fid);
    } catch (error) {
      console.error('[AuthContext] Error updating auth from SIWN:', error);
    }
  };
  
  // Provide the context value
  const contextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signOut,
    refreshUser,
    // Add this method to the context value
    updateAuthFromSIWN,
  };
  
  return (
    <AuthContext.Provider value={contextValue as AuthContextType}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to update auth from SIWN
export const useUpdateAuthFromSIWN = () => {
  const context = useContext(AuthContext);
  
  // Check if the context has the updateAuthFromSIWN method
  if (!context || !(context as any).updateAuthFromSIWN) {
    throw new Error('useUpdateAuthFromSIWN must be used within an AuthProvider');
  }
  
  return (context as any).updateAuthFromSIWN;
}; 