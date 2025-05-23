'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';

interface ScheduledCast {
  id: string;
  content: string;
  scheduled_at: string;
  posted: boolean;
  posted_at?: string;
  error_message?: string;
  channel_id?: string;
}

export default function WorkingModernScheduledCasts() {
  const { user } = useAuth();
  const [casts, setCasts] = useState<ScheduledCast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCasts = async () => {
    if (!user?.fid) return;

    try {
      setError(null);
      const response = await fetch(`/api/casts?fid=${user.fid}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch scheduled casts');
      }
      
      const data = await response.json();
      setCasts(data.casts || []);
    } catch (err) {
      console.error('Error fetching casts:', err);
      setError((err as Error)?.message || 'Failed to load casts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCasts();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchCasts, 30000);
    return () => clearInterval(interval);
  }, [user?.fid]);

  const getStatusInfo = (cast: ScheduledCast) => {
    if (cast.posted) {
      return {
        label: 'Posted',
        color: 'green',
        icon: (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      };
    }
    
    if (cast.error_message) {
      return {
        label: 'Failed',
        color: 'red',
        icon: (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      };
    }

    const scheduledTime = new Date(cast.scheduled_at);
    const now = new Date();
    
    if (scheduledTime > now) {
      return {
        label: 'Pending',
        color: 'yellow',
        icon: (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        )
      };
    }

    return {
      label: 'Processing',
      color: 'blue',
      icon: (
        <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    };
  };

  const getStatusStyle = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'red':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'blue':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-lg border border-gray-100">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">Loading your scheduled casts...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 p-6 shadow-lg border border-red-200">
        <div className="flex items-center">
          <svg className="h-6 w-6 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading casts</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (casts.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-lg border border-gray-100 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No scheduled casts yet</h3>
        <p className="text-gray-600">Create your first scheduled cast to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Your Scheduled Casts ({casts.length})
        </h3>
        <button
          onClick={fetchCasts}
          className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors duration-200"
        >
          <svg className="h-4 w-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Casts Grid */}
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-1">
        {casts.map((cast) => {
          const statusInfo = getStatusInfo(cast);
          const statusStyle = getStatusStyle(statusInfo.color);
          
          return (
            <div
              key={cast.id}
              className="rounded-2xl bg-white p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200"
            >
              {/* Status Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${statusStyle}`}>
                  {statusInfo.icon}
                  <span className="ml-2">{statusInfo.label}</span>
                </div>
                {cast.channel_id && (
                  <div className="inline-flex items-center rounded-full bg-purple-100 text-purple-800 px-2 py-1 text-xs font-medium">
                    # {cast.channel_id}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="mb-4">
                <p className="text-gray-900 leading-relaxed">
                  {cast.content.length > 140 
                    ? `${cast.content.substring(0, 140)}...` 
                    : cast.content}
                </p>
              </div>

              {/* Timing */}
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <svg className="h-4 w-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    Scheduled: {format(new Date(cast.scheduled_at), 'MMM d, yyyy \'at\' h:mm a')}
                  </span>
                </div>
                
                {cast.posted && cast.posted_at && (
                  <div className="flex items-center">
                    <svg className="h-4 w-4 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>
                      Posted: {format(new Date(cast.posted_at), 'MMM d, yyyy \'at\' h:mm a')}
                    </span>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {cast.error_message && (
                <div className="mt-4 rounded-lg bg-red-50 p-3 border border-red-200">
                  <p className="text-sm text-red-700">
                    <strong>Error:</strong> {cast.error_message}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 