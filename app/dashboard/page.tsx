'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/user-context';
import { useAuth } from '@/lib/auth-context';
import CastForm from '@/components/CastForm';
import ScheduledCasts from '@/components/ScheduledCasts';

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isLoading: userLoading, supabaseUser } = useUser();
  const router = useRouter();

  // Redirect to homepage if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || userLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // We'll redirect in the useEffect
  }

  return (
    <div className="flex flex-col">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      {supabaseUser ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <CastForm />
          </div>
          <div>
            <ScheduledCasts />
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-yellow-700">
            Unable to load your user profile. Please try refreshing the page.
          </p>
        </div>
      )}
    </div>
  );
} 