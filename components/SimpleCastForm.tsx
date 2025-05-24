'use client';

import { useState } from 'react';
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

export default function SimpleCastForm() {
  const { supabaseUser } = useUser();
  const { user: authUser } = useAuth();
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
    } catch (error) {
      console.error('Error scheduling cast:', error);
      setSubmitError((error as Error)?.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm w-full max-w-md mx-auto">
      <h3 className="mb-6 text-lg font-semibold text-gray-900">
        Schedule a Cast
      </h3>

      {submitSuccess && (
        <div className="bg-green-50 text-green-700 p-3 rounded-md mb-4 text-sm">
          ✅ Your cast has been scheduled successfully!
        </div>
      )}

      {submitError && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">
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
            className="w-full p-3 border border-gray-300 rounded-md text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Share your thoughts with the world..."
            maxLength={320}
            {...register('content', { required: 'Content is required' })}
          />
          {errors.content && (
            <p className="text-red-600 text-xs mt-1">
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
              className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              {...register('scheduledDate', { required: 'Date is required' })}
            />
            {errors.scheduledDate && (
              <p className="text-red-600 text-xs mt-1">
                {errors.scheduledDate.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time
            </label>
            <input
              type="time"
              className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              {...register('scheduledTime', { required: 'Time is required' })}
            />
            {errors.scheduledTime && (
              <p className="text-red-600 text-xs mt-1">
                {errors.scheduledTime.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Channel (optional)
          </label>
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="e.g. farcaster, crypto, art"
            {...register('channelId')}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 px-4 rounded-md text-white font-medium text-sm transition-colors ${
            isSubmitting 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-purple-600 hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2'
          }`}
        >
          {isSubmitting ? 'Scheduling...' : 'Schedule Cast'}
        </button>
      </form>
    </div>
  );
} 