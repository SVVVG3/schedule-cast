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

        // Filter to only show upcoming casts (not posted) and sort by scheduled_at (next one first)
        const upcomingCasts = (result.data || [])
          .filter((cast: ScheduledCast) => !cast.posted)
          .sort((a: ScheduledCast, b: ScheduledCast) => 
            new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
          );
        setCasts(upcomingCasts);
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
      <div className="text-center py-8">
        <p className="text-gray-300 text-xl">Loading your scheduled casts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 p-8 rounded-xl border border-red-700">
        <p className="text-red-200 text-xl">Error: {error}</p>
      </div>
    );
  }

  if (casts.length === 0) {
    return (
      <div className="bg-gray-800 p-10 rounded-xl text-center border border-gray-700" style={{ backgroundColor: '#1f2937 !important', color: '#ffffff !important', borderColor: '#374151 !important' }}>
        <p className="text-gray-300 text-xl">No upcoming scheduled casts.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700" style={{ backgroundColor: '#1f2937 !important', color: '#ffffff !important', borderColor: '#374151 !important' }}>
      <h3 className="text-3xl font-semibold p-8 border-b border-gray-700 text-white text-center">Upcoming Casts</h3>
      <ul className="divide-y divide-gray-700">
        {casts.map(cast => (
          <li key={cast.id} className="p-8 hover:bg-gray-750">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between space-y-4 sm:space-y-0">
              <div className="flex-1">
                <p className="mb-4 font-medium text-xl text-gray-200">
                  {format(new Date(cast.scheduled_at), 'PPP')} at {format(new Date(cast.scheduled_at), 'p')}
                </p>
                <p className="text-white whitespace-pre-wrap text-lg leading-relaxed">{cast.content}</p>
                {cast.channel_id && (
                  <p className="mt-4 text-lg text-gray-400">
                    Channel: {cast.channel_id}
                  </p>
                )}
              </div>
              <div className="ml-0 sm:ml-6 flex-shrink-0 flex justify-end sm:justify-start">
                {cast.posted ? (
                  <span className="inline-flex items-center px-4 py-2 rounded-lg text-base font-medium bg-green-900 text-green-200 border border-green-700">
                    Posted
                  </span>
                ) : (
                  <span className="inline-flex items-center px-4 py-2 rounded-lg text-base font-medium bg-blue-900 text-blue-200 border border-blue-700">
                    Scheduled
                  </span>
                )}
              </div>
            </div>
            {cast.error && (
              <div className="mt-6 p-6 bg-red-900 text-lg text-red-200 rounded-lg border border-red-700">
                Error: {cast.error}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
} 