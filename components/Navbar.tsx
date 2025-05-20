'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import AuthButton from './AuthButton';

export default function Navbar() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      setLoading(false);
    }
  }, [isLoading]);

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-purple-600">Schedule Cast</span>
            </Link>
            {isAuthenticated && (
              <div className="ml-6 flex space-x-8">
                <Link 
                  href="/dashboard" 
                  className="border-transparent text-gray-500 hover:border-purple-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/api-test" 
                  className="border-transparent text-gray-500 hover:border-purple-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  API Test
                </Link>
              </div>
            )}
          </div>
          <div className="flex items-center">
            {!loading && <AuthButton />}
          </div>
        </div>
      </div>
    </nav>
  );
} 