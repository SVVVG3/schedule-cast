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
      <div className="text-center py-6">
        <p className="text-gray-300 text-lg">Loading your scheduled casts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 p-6 rounded-xl border border-red-700">
        <p className="text-red-200 text-lg">Error: {error}</p>
      </div>
    );
  }

  if (casts.length === 0) {
    return (
      <div className="bg-gray-800 p-8 rounded-xl text-center border border-gray-700">
        <p className="text-gray-300 text-lg">You haven&apos;t scheduled any casts yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700">
      <h3 className="text-2xl font-semibold p-6 border-b border-gray-700 text-white text-center">Your Scheduled Casts</h3>
      <ul className="divide-y divide-gray-700">
        {casts.map(cast => (
          <li key={cast.id} className="p-6 hover:bg-gray-750">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="mb-2 font-medium text-lg text-gray-200">
                  {format(new Date(cast.scheduled_at), 'PPP')} at {format(new Date(cast.scheduled_at), 'p')}
                </p>
                <p className="text-white whitespace-pre-wrap text-base leading-relaxed">{cast.content}</p>
                {cast.channel_id && (
                  <p className="mt-3 text-base text-gray-400">
                    Channel: {cast.channel_id}
                  </p>
                )}
              </div>
              <div className="ml-6 flex-shrink-0">
                {cast.posted ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-900 text-green-200 border border-green-700">
                    Posted
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-900 text-blue-200 border border-blue-700">
                    Scheduled
                  </span>
                )}
              </div>
            </div>
            {cast.error && (
              <div className="mt-4 p-4 bg-red-900 text-base text-red-200 rounded-lg border border-red-700">
                Error: {cast.error}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
} 