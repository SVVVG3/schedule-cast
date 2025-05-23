'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { useUser } from '@/lib/user-context';
import { useAuth } from '@/lib/auth-context';

interface CastFormData {
  content: string;
  scheduledDate: string;
  scheduledTime: string;
  channelId?: string;
}

export default function WorkingModernCastForm() {
  const { supabaseUser } = useUser();
  const { user: authUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [characterCount, setCharacterCount] = useState(0);
  
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<CastFormData>({
    defaultValues: {
      content: '',
      scheduledDate: format(new Date(), 'yyyy-MM-dd'),
      scheduledTime: format(new Date(Date.now() + 30 * 60 * 1000), 'HH:mm'),
      channelId: ''
    }
  });

  const watchContent = watch('content', '');
  
  useEffect(() => {
    setCharacterCount(watchContent.length);
  }, [watchContent]);

  const onSubmit = async (data: CastFormData) => {
    if (!supabaseUser || !authUser?.fid) {
      setSubmitError('You must be logged in to schedule casts');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const scheduledAt = new Date(`${data.scheduledDate}T${data.scheduledTime}`);
      
      if (scheduledAt <= new Date()) {
        setSubmitError('Scheduled time must be in the future');
        setIsSubmitting(false);
        return;
      }

      const castData = {
        content: data.content,
        scheduled_at: scheduledAt.toISOString(),
        channel_id: data.channelId || null
      };

      const response = await fetch(`/api/casts?fid=${authUser.fid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(castData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to schedule cast');
      }

      setSubmitSuccess(true);
      reset();
      setCharacterCount(0);
    } catch (error) {
      console.error('Error scheduling cast:', error);
      setSubmitError((error as Error)?.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      {/* Modern Card with Gradient Border */}
      <div className="relative overflow-hidden rounded-2xl shadow-2xl" style={{
        background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #3b82f6 100%)',
        padding: '2px'
      }}>
        <div className="rounded-2xl bg-white p-6 sm:p-8">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)'
            }}>
              <svg
                className="h-6 w-6 text-white"
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Schedule a Cast</h2>
            <p className="text-gray-600">Share your thoughts with Farcaster</p>
          </div>

          {/* Success Message */}
          {submitSuccess && (
            <div className="mb-6 rounded-lg bg-green-50 p-4 shadow-sm border border-green-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    🎉 Your cast has been scheduled successfully!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {submitError && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 shadow-sm border border-red-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{submitError}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Cast Content */}
            <div>
              <label htmlFor="content" className="block text-sm font-semibold text-gray-700 mb-2">
                What's on your mind? ✨
              </label>
              <div className="relative">
                <textarea
                  id="content"
                  rows={4}
                  className={`w-full rounded-xl border-2 px-4 py-3 text-gray-900 placeholder-gray-500 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none ${
                    errors.content
                      ? 'border-red-300 bg-red-50'
                      : characterCount >= 320
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300'
                  }`}
                  placeholder="Share your thoughts with the world..."
                  maxLength={320}
                  {...register('content', { 
                    required: 'Content is required',
                    onChange: (e) => setCharacterCount(e.target.value.length)
                  })}
                />
                <div className="absolute bottom-3 right-3 text-xs font-medium">
                  <span className={characterCount >= 320 ? 'text-red-500' : characterCount >= 280 ? 'text-orange-500' : 'text-gray-400'}>
                    {characterCount}/320
                  </span>
                </div>
              </div>
              {errors.content && (
                <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="scheduledDate" className="block text-sm font-semibold text-gray-700 mb-2">
                  📅 Date
                </label>
                <input
                  type="date"
                  id="scheduledDate"
                  className={`w-full rounded-xl border-2 px-4 py-3 text-gray-900 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.scheduledDate
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300'
                  }`}
                  {...register('scheduledDate', { required: 'Date is required' })}
                />
                {errors.scheduledDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.scheduledDate.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="scheduledTime" className="block text-sm font-semibold text-gray-700 mb-2">
                  ⏰ Time
                </label>
                <input
                  type="time"
                  id="scheduledTime"
                  className={`w-full rounded-xl border-2 px-4 py-3 text-gray-900 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.scheduledTime
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300'
                  }`}
                  {...register('scheduledTime', { required: 'Time is required' })}
                />
                {errors.scheduledTime && (
                  <p className="mt-1 text-sm text-red-600">{errors.scheduledTime.message}</p>
                )}
              </div>
            </div>

            {/* Channel (Optional) */}
            <div>
              <label htmlFor="channelId" className="block text-sm font-semibold text-gray-700 mb-2">
                # Channel (optional)
              </label>
              <input
                type="text"
                id="channelId"
                className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-500 shadow-sm transition-all duration-200 hover:bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g. farcaster, crypto, art"
                {...register('channelId')}
              />
              <p className="mt-1 text-xs text-gray-500">Leave blank to post to your main feed</p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || characterCount === 0 || characterCount > 320}
              className="w-full rounded-xl px-6 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              style={{
                background: isSubmitting || characterCount === 0 || characterCount > 320 
                  ? '#9ca3af' 
                  : 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)'
              }}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Scheduling...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Schedule Cast
                </div>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 