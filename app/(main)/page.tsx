'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import CompactCastForm from '@/components/CompactCastForm';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  // If loading, show minimal content
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="flex items-center justify-center mb-6">
          <svg 
            className="text-purple-600 mr-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            width="40"
            height="40"
            style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          <h1 className="text-4xl font-bold text-gray-900">Schedule Cast</h1>
        </div>
        <p className="text-center text-gray-600">Loading...</p>
      </div>
    );
  }
  
  // If already authenticated, don't show anything (will redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 py-12 px-4">
      <div className="mx-auto">
        
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="max-w-6xl mx-auto">
            {/* Main Title with Triangle */}
            <div className="flex items-center justify-center mb-8">
              <svg 
                className="text-purple-600 mr-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                width="48"
                height="48"
                style={{ width: '48px', height: '48px', minWidth: '48px', minHeight: '48px' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <h1 className="text-5xl font-bold text-gray-900">Schedule Cast</h1>
            </div>
            
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Get Started</h2>
              <p className="text-gray-600">Sign in with Neynar to start scheduling casts</p>
            </div>
            
            <div className="text-center">
              <h3 className="font-semibold text-gray-900 mb-2">💡 Pro Tip</h3>
              <p className="text-gray-700 text-sm mb-4">
                After signing in here, you'll be automatically signed in to our 
                <strong> mini app</strong> for easy scheduling on-the-go!
              </p>
              <a 
                href="https://farcaster.xyz/miniapps/2gUG8a57KZYm/schedule-cast" 
                className="inline-flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
                target="_blank" 
                rel="noopener noreferrer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>Open Mini App</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Cast Form */}
        <CompactCastForm />

      </div>
    </div>
  )
} 