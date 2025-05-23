'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useUser } from '@/lib/user-context';

export default function ModernNavbar() {
  const { user: authUser, isAuthenticated } = useAuth();
  const { supabaseUser } = useUser();

  return (
    <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-lg shadow-sm">
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
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Schedule Cast
            </span>
          </Link>

          {/* Navigation Links - Hidden on mobile, shown on larger screens */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              href="/"
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

          {/* User Info */}
          <div className="flex items-center">
            {isAuthenticated && authUser ? (
              <div className="flex items-center space-x-3">
                {/* User Avatar */}
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                    <span className="text-xs font-semibold text-white">
                      {authUser.username?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-gray-900">
                      {authUser.username || `FID ${authUser.fid}`}
                    </p>
                    <p className="text-xs text-gray-600">Connected</p>
                  </div>
                </div>

                {/* Sign Out Button */}
                <button
                  onClick={() => {
                    // Add sign out logic here
                    window.location.href = '/';
                  }}
                  className="hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-red-600 transition-colors duration-200"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                Not connected
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu - Show navigation links on mobile */}
      <div className="md:hidden border-t bg-white px-4 py-2">
        <div className="flex space-x-4">
          <Link
            href="/"
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
        </div>
      </div>
    </nav>
  );
} 