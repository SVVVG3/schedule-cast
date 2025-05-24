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
    <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-lg w-full max-w-lg mx-auto">
      <h3 className="mb-8 text-2xl font-semibold text-white text-center">
        Schedule a Cast
      </h3>

      {submitSuccess && (
        <div className="bg-green-900 text-green-200 p-4 rounded-lg mb-6 border border-green-700">
          ✅ Your cast has been scheduled successfully!
        </div>
      )}

      {submitError && (
        <div className="bg-red-900 text-red-200 p-4 rounded-lg mb-6 border border-red-700">
          ❌ {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-lg font-medium text-gray-300 mb-3">
            What's on your mind?
          </label>
          <textarea
            rows={5}
            className="w-full p-4 border border-gray-600 rounded-lg text-base resize-none bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Share your thoughts with the world..."
            maxLength={320}
            {...register('content', { required: 'Content is required' })}
          />
          {errors.content && (
            <p className="text-red-400 text-sm mt-2">
              {errors.content.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-lg font-medium text-gray-300 mb-3">
              Date
            </label>
            <input
              type="date"
              className="w-full p-4 border border-gray-600 rounded-lg text-base bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              {...register('scheduledDate', { required: 'Date is required' })}
            />
            {errors.scheduledDate && (
              <p className="text-red-400 text-sm mt-2">
                {errors.scheduledDate.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-lg font-medium text-gray-300 mb-3">
              Time
            </label>
            <input
              type="time"
              className="w-full p-4 border border-gray-600 rounded-lg text-base bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              {...register('scheduledTime', { required: 'Time is required' })}
            />
            {errors.scheduledTime && (
              <p className="text-red-400 text-sm mt-2">
                {errors.scheduledTime.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-lg font-medium text-gray-300 mb-3">
            Channel (optional)
          </label>
          <input
            type="text"
            className="w-full p-4 border border-gray-600 rounded-lg text-base bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="e.g. farcaster, crypto, art"
            {...register('channelId')}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-4 px-6 rounded-lg text-white font-semibold text-lg transition-colors ${
            isSubmitting 
              ? 'bg-gray-600 cursor-not-allowed' 
              : 'bg-purple-600 hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2'
          }`}
        >
          {isSubmitting ? 'Scheduling...' : 'Schedule Cast'}
        </button>
      </form>
    </div>
  );
} 