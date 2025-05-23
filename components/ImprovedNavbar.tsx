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

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
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
                  {/* User Info - Show username first */}
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">
                      {authUser.username || `FID ${authUser.fid}`}
                    </p>
                  </div>

                  {/* User Avatar - Small and Fixed */}
                  <div style={{ width: '32px', height: '32px' }} className="rounded-full overflow-hidden bg-gray-200 border-2 border-purple-200 flex-shrink-0">
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
                  <div className="absolute right-0 mt-2 w-40 rounded-lg bg-white py-1 shadow-lg border border-gray-200">
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
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
              <div className="text-sm text-gray-600">
                Not connected
              </div>
            )}
          </div>
        </div>
      </div>


    </nav>
  );
} 