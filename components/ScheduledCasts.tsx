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
  media_urls: string[] | null;
  media_types: string[] | null;
  has_media: boolean;
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
      <div className="bg-gray-800 p-8 rounded-xl text-center border border-gray-700" style={{ backgroundColor: '#1f2937 !important', color: '#ffffff !important', borderColor: '#374151 !important' }}>
        <p className="text-gray-300 text-xl">No upcoming scheduled casts.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700" style={{ backgroundColor: '#1f2937 !important', color: '#ffffff !important', borderColor: '#374151 !important' }}>
      <h3 className="text-3xl font-semibold p-8 border-b border-gray-700 text-white text-center">Upcoming Casts</h3>
      <div className="divide-y divide-gray-700">
        {casts.map(cast => (
          <div key={cast.id} className="p-8 hover:bg-gray-750">
            <div className="flex flex-col space-y-4">
              {/* Date and Time - Centered */}
              <div className="text-center">
                <p className="font-medium text-xl text-gray-200">
                  {format(new Date(cast.scheduled_at), 'PPP')} at {format(new Date(cast.scheduled_at), 'p')}
                </p>
              </div>
              
              {/* Content - Centered */}
              <div className="text-center">
                <p className="text-white whitespace-pre-wrap text-lg leading-relaxed">{cast.content}</p>
              </div>
                
              {/* Media Preview - Centered */}
              {cast.has_media && cast.media_urls && cast.media_urls.length > 0 && (
                <div className="flex justify-center">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {cast.media_urls.slice(0, 2).map((url, index) => {
                      const isImage = cast.media_types?.[index]?.startsWith('image/') || 
                                     cast.media_types?.[index] === 'gif' ||
                                     url.toLowerCase().includes('.gif') ||
                                     url.toLowerCase().includes('.jpg') ||
                                     url.toLowerCase().includes('.jpeg') ||
                                     url.toLowerCase().includes('.png') ||
                                     url.toLowerCase().includes('.webp');
                      
                      return (
                        <div key={index} className="relative">
                          {isImage ? (
                            <img
                              src={url}
                              alt={`Media ${index + 1}`}
                              className="w-16 h-16 object-cover rounded-lg border border-gray-600"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-700 rounded-lg border border-gray-600 flex items-center justify-center">
                              <span className="text-2xl">🎥</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {cast.media_urls.length > 2 && (
                      <div className="w-16 h-16 bg-gray-700 rounded-lg border border-gray-600 flex items-center justify-center">
                        <span className="text-xs text-gray-300">+{cast.media_urls.length - 2}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Channel and Status - Centered */}
              <div className="flex flex-col items-center space-y-2">
                {cast.channel_id && (
                  <p className="text-lg text-gray-400">
                    Channel: {cast.channel_id}
                  </p>
                )}
                <div>
                  {cast.posted ? (
                    <span className="inline-flex items-center px-4 py-2 rounded-lg text-base font-medium bg-green-900 text-green-200 border border-green-700">
                      Posted
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-4 py-2 rounded-lg text-base font-medium bg-blue-900 text-blue-200">
                      Scheduled
                    </span>
                  )}
                </div>
              </div>
            </div>
            {cast.error && (
              <div className="mt-6 p-6 bg-red-900 text-lg text-red-200 rounded-lg border border-red-700">
                Error: {cast.error}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 