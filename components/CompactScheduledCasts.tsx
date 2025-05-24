'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
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

export default function CompactScheduledCasts() {
  const { user } = useAuth();
  const [casts, setCasts] = useState<ScheduledCast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCasts() {
      if (!user?.fid) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/casts?fid=${user.fid}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch scheduled casts');
        }

        // Filter to only show upcoming (not posted) casts and sort by scheduled time (earliest first)
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

    if (user?.fid) {
      fetchCasts();
    }
  }, [user?.fid]);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-300 text-sm">Loading casts...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 p-4 rounded-xl border border-red-700">
        <p className="text-red-200 text-sm">Error: {error}</p>
      </div>
    );
  }

  if (casts.length === 0) {
    return (
      <div className="bg-gray-800 p-4 rounded-xl text-center border border-gray-700">
        <p className="text-gray-300 text-sm">No upcoming casts scheduled.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">
          Upcoming Casts ({casts.length})
        </h3>
      </div>
      <div className="divide-y divide-gray-700">
        {casts.map(cast => (
          <div key={cast.id} className="p-4">
            <div className="space-y-2">
              {/* Date and time */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-purple-300">
                  {format(new Date(cast.scheduled_at), 'MMM d')} at {format(new Date(cast.scheduled_at), 'h:mm a')}
                </p>
                {cast.channel_id && (
                  <span className="text-xs bg-purple-900 text-purple-200 px-2 py-1 rounded">
                    #{cast.channel_id}
                  </span>
                )}
              </div>
              
              {/* Content preview */}
              <p className="text-white text-sm leading-relaxed line-clamp-3">
                {cast.content.length > 120 ? `${cast.content.slice(0, 120)}...` : cast.content}
              </p>
              
              {/* Error message if any */}
              {cast.error && (
                <div className="mt-2 p-2 bg-red-900 text-red-200 rounded text-xs">
                  Error: {cast.error}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 