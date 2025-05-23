'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useUser } from '@/lib/user-context';

export default function ImprovedNavbar() {
  const { user: authUser, isAuthenticated, signOut } = useAuth();
  const { supabaseUser } = useUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">
              Schedule Cast
            </span>
          </Link>

          {/* Navigation Links - Hidden on mobile */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              href="/dashboard"
              className="text-gray-700 hover:text-purple-600 transition-colors duration-200 font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/api-test"
              className="text-gray-700 hover:text-purple-600 transition-colors duration-200 font-medium"
            >
              API Test
            </Link>
          </div>

          {/* User Section */}
          <div className="flex items-center">
            {isAuthenticated && authUser ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-3 rounded-lg p-2 hover:bg-gray-50 transition-colors duration-200"
                >
                  {/* User Avatar */}
                  <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 border-2 border-purple-200">
                    {authUser.avatar ? (
                      <img
                        src={authUser.avatar}
                        alt={authUser.username || 'User'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                        <span className="text-xs font-semibold text-white">
                          {authUser.username?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* User Info */}
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold text-gray-900">
                      {authUser.username || `FID ${authUser.fid}`}
                    </p>
                    <p className="text-xs text-gray-600">
                      {authUser.displayName || 'Connected'}
                    </p>
                  </div>

                  {/* Dropdown Arrow */}
                  <svg
                    className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
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
                  <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="px-4 py-2 border-b">
                      <p className="text-sm font-semibold text-gray-900">
                        {authUser.username || `FID ${authUser.fid}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {authUser.displayName || 'Farcaster User'}
                      </p>
                    </div>
                    
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <div className="flex items-center">
                        <svg className="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Dashboard
                      </div>
                    </Link>

                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                    >
                      <div className="flex items-center">
                        <svg className="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </div>
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
              <div className="text-sm text-gray-600">
                Not connected
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <div className="md:hidden border-t bg-white px-4 py-2">
        <div className="flex space-x-4">
          <Link
            href="/dashboard"
            className="text-sm text-gray-700 hover:text-purple-600 transition-colors duration-200 font-medium"
          >
            Dashboard
          </Link>
          <Link
            href="/api-test"
            className="text-sm text-gray-700 hover:text-purple-600 transition-colors duration-200 font-medium"
          >
            API Test
          </Link>
          {isAuthenticated && (
            <button
              onClick={handleSignOut}
              className="text-sm text-red-600 hover:text-red-700 transition-colors duration-200 font-medium"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </nav>
  );
} 