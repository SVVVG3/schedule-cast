'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { useUser } from '@/lib/user-context';
import { useAuth } from '@/lib/auth-context';
import NeynarSignInButton from './NeynarSignInButton';
import SignerApprovalChecker from './SignerApprovalChecker';

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
    <div className="w-full max-w-sm sm:max-w-lg mx-auto">
      <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 sm:p-8" style={{ backgroundColor: '#1f2937 !important', color: '#ffffff !important', borderColor: '#374151 !important' }}>
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          Schedule Your Cast
        </h2>

        {submitSuccess && (
          <div className="bg-green-900 border border-green-700 text-green-200 px-4 py-4 rounded-lg mb-6 text-lg">
            ✅ Your cast has been scheduled successfully!
          </div>
        )}

        {submitError && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-4 rounded-lg mb-6 text-lg">
            ❌ {submitError}
          </div>
        )}

        <SignerApprovalChecker
          fallback={
            <div className="text-center py-10">
              <p className="text-gray-300 mb-6 text-lg">
                Please approve your signer to start scheduling casts
              </p>
            </div>
          }
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-lg font-medium text-gray-300 mb-3">
                What's on your mind?
              </label>
              <textarea
                rows={5}
                style={{ backgroundColor: '#374151 !important', color: '#ffffff !important', borderColor: '#4b5563 !important' }}
                className={`w-full px-4 py-4 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-base ${
                  !isAuthenticated ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-700 text-white border-gray-600 placeholder-gray-400'
                }`}
                placeholder={isAuthenticated ? "Share your thoughts with the world..." : "Sign in to schedule casts..."}
                maxLength={320}
                disabled={!isAuthenticated}
                {...register('content', { required: 'Content is required' })}
              />
              {errors.content && (
                <p className="text-red-400 text-sm mt-2">
                  {errors.content.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-lg font-medium text-gray-300 mb-3">
                  Date
                </label>
                <input
                  type="date"
                  className={`w-full px-4 py-4 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base ${
                    !isAuthenticated ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-700 text-white border-gray-600'
                  }`}
                  disabled={!isAuthenticated}
                  {...register('scheduledDate', { required: 'Date is required' })}
                />
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-300 mb-3">
                  Time
                </label>
                <input
                  type="time"
                  className={`w-full px-4 py-4 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base ${
                    !isAuthenticated ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-700 text-white border-gray-600'
                  }`}
                  disabled={!isAuthenticated}
                  {...register('scheduledTime', { required: 'Time is required' })}
                />
              </div>
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-300 mb-3">
                Channel (optional)
              </label>
              <input
                type="text"
                className={`w-full px-4 py-4 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base ${
                  !isAuthenticated ? 'bg-gray-700 text-gray-400 border-gray-600 placeholder-gray-500' : 'bg-gray-700 text-white border-gray-600 placeholder-gray-400'
                }`}
                placeholder={isAuthenticated ? "e.g. farcaster, crypto, art" : "Sign in to use channels"}
                disabled={!isAuthenticated}
                {...register('channelId')}
              />
            </div>

            <button
              type="submit"
              disabled={!isAuthenticated || isSubmitting}
              className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-colors duration-200 ${
                !isAuthenticated
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : isSubmitting
                  ? 'bg-purple-500 text-white cursor-not-allowed'
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
        </SignerApprovalChecker>

        {!isAuthenticated && (
          <div className="text-center mt-6">
            <p className="text-base text-gray-300 mb-4">
              Sign in with your Farcaster account to start scheduling casts
            </p>
            <NeynarSignInButton theme="dark" className="inline-block" />
          </div>
        )}
      </div>
    </div>
  );
} 