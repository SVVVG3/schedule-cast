'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { useUser } from '@/lib/user-context';
import { useAuth } from '@/lib/auth-context';
import NeynarSignInButton from './NeynarSignInButton';

interface CastFormData {
  content: string;
  scheduledDate: string;
  scheduledTime: string;
  channelId?: string;
}

export default function CompactCastForm() {
  const { supabaseUser } = useUser();
  const { user: authUser, isAuthenticated } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CastFormData>({
    defaultValues: {
      content: '',
      scheduledDate: format(new Date(), 'yyyy-MM-dd'),
      scheduledTime: format(new Date(Date.now() + 30 * 60 * 1000), 'HH:mm'),
      channelId: ''
    }
  });

  const onSubmit = async (data: CastFormData) => {
    if (!isAuthenticated || !supabaseUser || !authUser?.fid) {
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
    } catch (error) {
      console.error('Error scheduling cast:', error);
      setSubmitError((error as Error)?.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Schedule Your Cast
        </h2>

        {submitSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4">
            ✅ Your cast has been scheduled successfully!
          </div>
        )}

        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
            ❌ {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What's on your mind?
            </label>
            <textarea
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none ${
                !isAuthenticated ? 'bg-gray-100 text-gray-500' : 'border-gray-300'
              }`}
              placeholder={isAuthenticated ? "Share your thoughts with the world..." : "Sign in to schedule casts..."}
              maxLength={320}
              disabled={!isAuthenticated}
              {...register('content', { required: 'Content is required' })}
            />
            {errors.content && (
              <p className="text-red-600 text-sm mt-1">
                {errors.content.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  !isAuthenticated ? 'bg-gray-100 text-gray-500' : 'border-gray-300'
                }`}
                disabled={!isAuthenticated}
                {...register('scheduledDate', { required: 'Date is required' })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time
              </label>
              <input
                type="time"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  !isAuthenticated ? 'bg-gray-100 text-gray-500' : 'border-gray-300'
                }`}
                disabled={!isAuthenticated}
                {...register('scheduledTime', { required: 'Time is required' })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Channel (optional)
            </label>
            <input
              type="text"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                !isAuthenticated ? 'bg-gray-100 text-gray-500' : 'border-gray-300'
              }`}
              placeholder={isAuthenticated ? "e.g. farcaster, crypto, art" : "Sign in to use channels"}
              disabled={!isAuthenticated}
              {...register('channelId')}
            />
          </div>

          <button
            type="submit"
            disabled={!isAuthenticated || isSubmitting}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200 ${
              !isAuthenticated
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : isSubmitting
                ? 'bg-purple-400 text-white cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {!isAuthenticated 
              ? 'Sign in to Schedule Cast' 
              : isSubmitting 
              ? 'Scheduling...' 
              : 'Schedule Cast'
            }
          </button>
        </form>

        {!isAuthenticated && (
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600 mb-3">
              Sign in with your Farcaster account to start scheduling casts
            </p>
            <NeynarSignInButton theme="dark" className="inline-block" />
          </div>
        )}
      </div>
    </div>
  );
} 