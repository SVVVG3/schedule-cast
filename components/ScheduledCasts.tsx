'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useUser } from '@/lib/user-context';
import { useAuth } from '@/lib/auth-context';

interface ScheduledCast {
  id: string;
  content: string;
  scheduled_at: string;
  channel_id: string | null;
  posted: boolean;
  posted_at: string | null;
  error: string | null;
}

export default function ScheduledCasts() {
  const { supabaseUser } = useUser();
  const { user: authUser } = useAuth();
  const [casts, setCasts] = useState<ScheduledCast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCasts() {
      if (!supabaseUser || !authUser?.fid) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/casts?fid=${authUser.fid}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch scheduled casts');
        }

        setCasts(result.data || []);
      } catch (err) {
        console.error('Error fetching casts:', err);
        setError((err as Error)?.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (supabaseUser && authUser?.fid) {
      fetchCasts();
    }
  }, [supabaseUser, authUser]);

  if (loading) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-600">Loading your scheduled casts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
        <p className="text-red-700">Error: {error}</p>
      </div>
    );
  }

  if (casts.length === 0) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg text-center">
        <p className="text-gray-500">You haven&apos;t scheduled any casts yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <h3 className="text-lg font-medium p-4 border-b">Your Scheduled Casts</h3>
      <ul className="divide-y divide-gray-200">
        {casts.map(cast => (
          <li key={cast.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="mb-1 font-medium">
                  {format(new Date(cast.scheduled_at), 'PPP')} at {format(new Date(cast.scheduled_at), 'p')}
                </p>
                <p className="text-gray-800 whitespace-pre-wrap">{cast.content}</p>
                {cast.channel_id && (
                  <p className="mt-1 text-sm text-gray-500">
                    Channel: {cast.channel_id}
                  </p>
                )}
              </div>
              <div className="ml-4 flex-shrink-0">
                {cast.posted ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Posted
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Scheduled
                  </span>
                )}
              </div>
            </div>
            {cast.error && (
              <div className="mt-2 p-2 bg-red-50 text-sm text-red-700 rounded">
                Error: {cast.error}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
} 