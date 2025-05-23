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

export default function ModernScheduledCasts() {
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
      // Auto-refresh every 30 seconds to catch newly posted casts
      const interval = setInterval(fetchCasts, 30000);
      return () => clearInterval(interval);
    }
  }, [supabaseUser, authUser]);

  if (loading) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="animate-pulse rounded-2xl bg-gray-100 p-8">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 rounded-full bg-gray-200 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-48 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl bg-red-50 border border-red-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-red-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading casts</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (casts.length === 0) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 mb-4">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No scheduled casts yet</h3>
          <p className="text-gray-600">Create your first scheduled cast to get started!</p>
        </div>
      </div>
    );
  }

  const pendingCasts = casts.filter(cast => !cast.posted);
  const postedCasts = casts.filter(cast => cast.posted);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Your Scheduled Casts</h3>
        <p className="text-gray-600">
          {pendingCasts.length} pending • {postedCasts.length} posted
        </p>
      </div>

      {/* Pending Casts */}
      {pendingCasts.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            Pending ({pendingCasts.length})
          </h4>
          <div className="space-y-3">
            {pendingCasts.map(cast => (
              <CastCard key={cast.id} cast={cast} />
            ))}
          </div>
        </div>
      )}

      {/* Posted Casts */}
      {postedCasts.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Posted ({postedCasts.length})
          </h4>
          <div className="space-y-3">
            {postedCasts.map(cast => (
              <CastCard key={cast.id} cast={cast} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CastCard({ cast }: { cast: ScheduledCast }) {
  const isPending = !cast.posted;
  const hasError = !!cast.error;
  
  return (
    <div className={`rounded-xl border-2 p-4 transition-all duration-200 ${
      isPending 
        ? hasError
          ? 'border-red-200 bg-red-50'
          : 'border-blue-200 bg-blue-50'
        : 'border-green-200 bg-green-50'
    }`}>
      {/* Status and Time */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          {isPending ? (
            hasError ? (
              <div className="flex items-center text-red-600">
                <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-xs font-semibold">Failed</span>
              </div>
            ) : (
              <div className="flex items-center text-blue-600">
                <svg className="h-4 w-4 mr-1 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-xs font-semibold">Scheduled</span>
              </div>
            )
          ) : (
            <div className="flex items-center text-green-600">
              <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-xs font-semibold">Posted</span>
            </div>
          )}
        </div>
        
        <div className="text-right">
          <div className="text-xs font-medium text-gray-700">
            {format(new Date(cast.scheduled_at), 'MMM d')}
          </div>
          <div className="text-xs text-gray-500">
            {format(new Date(cast.scheduled_at), 'h:mm a')}
          </div>
        </div>
      </div>

      {/* Cast Content */}
      <div className="mb-3">
        <p className="text-gray-900 text-sm leading-relaxed line-clamp-3">
          {cast.content}
        </p>
      </div>

      {/* Channel */}
      {cast.channel_id && (
        <div className="mb-3">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            #{cast.channel_id}
          </span>
        </div>
      )}

      {/* Error Message */}
      {cast.error && (
        <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <svg
              className="h-4 w-4 text-red-400 mt-0.5 mr-2 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-xs font-medium text-red-800">Error</p>
              <p className="text-xs text-red-700 mt-1">{cast.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Posted At */}
      {cast.posted_at && (
        <div className="mt-3 pt-3 border-t border-green-200">
          <p className="text-xs text-green-700">
            Posted on {format(new Date(cast.posted_at), 'MMM d, yyyy \'at\' h:mm a')}
          </p>
        </div>
      )}
    </div>
  );
} 