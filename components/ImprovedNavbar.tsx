'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import AuthButton from './AuthButton';

export default function ImprovedNavbar() {
  const { user: authUser, isAuthenticated, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-700 bg-gray-800/95 backdrop-blur-sm shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Logo and App Name */}
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 flex-shrink-0">
              <svg
                className="h-5 w-5 text-white flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                width="20"
                height="20"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">
              Schedule Cast
            </span>
          </div>

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