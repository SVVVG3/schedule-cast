'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SupabaseStatus from '@/components/SupabaseStatus';
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
        <h1 className="text-4xl font-bold text-center mb-6">Schedule Cast</h1>
        <p className="text-center">Loading...</p>
      </div>
    );
  }
  
  // If already authenticated, don't show anything (will redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            Schedule Your Farcaster Casts
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Plan and schedule your Farcaster posts to be published at the perfect time
          </p>
        </div>

        {/* Cast Form */}
        <CompactCastForm />

        {/* Status */}
        <div className="mt-8 text-center">
          <SupabaseStatus />
        </div>

                 {/* Additional Info */}
         <div className="mt-12 text-center">
           <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
             <div className="bg-white rounded-lg p-6 shadow-sm">
               <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4 flex-shrink-0">
                 <svg className="w-6 h-6 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
               </div>
               <h3 className="font-semibold text-gray-900 mb-2">Perfect Timing</h3>
               <p className="text-sm text-gray-600">Schedule casts for any future date and time</p>
             </div>
             
             <div className="bg-white rounded-lg p-6 shadow-sm">
               <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4 flex-shrink-0">
                 <svg className="w-6 h-6 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m0 0v10a2 2 0 002 2h8a2 2 0 002-2V8" />
                 </svg>
               </div>
               <h3 className="font-semibold text-gray-900 mb-2">Channel Support</h3>
               <p className="text-sm text-gray-600">Post to specific channels or your main feed</p>
             </div>
             
             <div className="bg-white rounded-lg p-6 shadow-sm">
               <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4 flex-shrink-0">
                 <svg className="w-6 h-6 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                 </svg>
               </div>
               <h3 className="font-semibold text-gray-900 mb-2">Track & Manage</h3>
               <p className="text-sm text-gray-600">Monitor your scheduled and posted casts</p>
             </div>
           </div>
         </div>
        
        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            A modern Farcaster mini app for scheduling casts
          </p>
        </div>
      </div>
    </div>
  )
} 