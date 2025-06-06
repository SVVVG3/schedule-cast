'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useNeynarContext } from '@neynar/react';
import AuthButton from './AuthButton';

export default function ImprovedNavbar() {
  const { user: authUser, isAuthenticated, signOut } = useAuth();
  const { user: neynarUser } = useNeynarContext();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    console.log('🚪 BYPASS: Implementing signOut directly in navbar...');
    
    // Debug: Check what's in localStorage before clearing
    if (typeof window !== 'undefined') {
      const currentAuth = localStorage.getItem('siwn_auth_data');
      console.log('🚪 Current localStorage auth data:', currentAuth);
      
      localStorage.removeItem('siwn_auth_data');
      console.log('🚪 Cleared localStorage auth data');
      
      // Verify it's actually cleared
      const afterClear = localStorage.getItem('siwn_auth_data');
      console.log('🚪 After clear, localStorage auth data:', afterClear);
      
          // Also clear any Neynar SDK data from localStorage
    localStorage.removeItem('neynar_user');
    localStorage.removeItem('neynar_auth');
    localStorage.removeItem('neynar_access_token');
    localStorage.removeItem('NEYNAR_USER');
    localStorage.removeItem('NEYNAR_ACCESS_TOKEN');
    console.log('🚪 Cleared Neynar SDK data from localStorage');
    
    // Clear all localStorage to be extra sure
    Object.keys(localStorage).forEach(key => {
      if (key.toLowerCase().includes('neynar') || key.toLowerCase().includes('siwn')) {
        localStorage.removeItem(key);
        console.log(`🚪 Removed localStorage key: ${key}`);
      }
    });
    }
    
    // Try the original signOut (probably won't work due to caching)
    try {
      await signOut();
      console.log('🚪 Original signOut called');
    } catch (error) {
      console.log('🚪 Original signOut failed (expected due to caching):', error);
    }
    
    // Force page reload to clear cached auth-context state
    console.log('🚪 SOLUTION: Forcing page reload to clear cached auth-context state...');
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  };

  return (
    <nav className="sticky top-0 z-50 bg-gray-800/95 backdrop-blur-sm shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-end items-center">
          {/* Auth Section */}
          <div className="flex items-center">
            {isAuthenticated && authUser ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-3 rounded-lg p-2 hover:bg-gray-700 transition-colors duration-200"
                >
                  {/* User Info - Show username first */}
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white">
                      {authUser.username || `FID ${authUser.fid}`}
                    </p>
                  </div>

                  {/* User Avatar - Small and Fixed */}
                  <div style={{ width: '32px', height: '32px' }} className="rounded-full overflow-hidden bg-gray-600 border-2 border-purple-400 flex-shrink-0">
                    {authUser.avatar ? (
                      <img
                        src={authUser.avatar}
                        alt={authUser.username || 'User'}
                        style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: '32px', height: '32px' }} className="bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                        <span className="text-xs font-semibold text-white">
                          {authUser.username?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Dropdown Arrow - Small */}
                  <svg
                    style={{ width: '16px', height: '16px' }}
                    className={`text-gray-500 transition-transform duration-200 ${
                      dropdownOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-40 rounded-lg bg-gray-700 py-1 shadow-lg border border-gray-600">
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900"
                    >
                      Sign Out
                    </button>
                  </div>
                )}

                {/* Click outside to close dropdown */}
                {dropdownOpen && (
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDropdownOpen(false)}
                  />
                )}
              </div>
            ) : (
              <AuthButton className="px-4 py-2 text-sm" />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 