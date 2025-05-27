'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { useUser } from '@/lib/user-context';
import { useAuth } from '@/lib/auth-context';
import UniversalAuthButton from './UniversalAuthButton';
import SignerApprovalChecker from './SignerApprovalChecker';
import MediaUpload, { UploadedFile } from './MediaUpload';
import ChannelSelector from './ChannelSelector';

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
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | undefined>(undefined);
  
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
        channel_id: selectedChannelId || null,
        // Include media data if files are uploaded
        ...(uploadedFiles.length > 0 && {
          media_urls: uploadedFiles.map(file => file.url),
          media_types: uploadedFiles.map(file => file.type),
          media_metadata: {
            files: uploadedFiles.map(file => ({
              id: file.id,
              filename: file.filename,
              size: file.size,
              format: file.format
            }))
          }
        })
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
      setUploadedFiles([]); // Clear uploaded files
    } catch (error) {
      console.error('Error scheduling cast:', error);
      setSubmitError((error as Error)?.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full mx-auto" style={{ maxWidth: '1200px' }}>
      {/* Desktop width fix - force deploy */}
      <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-8 sm:p-10" style={{ backgroundColor: '#1f2937 !important', color: '#ffffff !important', borderColor: '#374151 !important' }}>

        {submitSuccess && (
          <div className="bg-green-900 border border-green-700 text-green-200 px-6 py-6 rounded-lg mb-8 text-xl">
            ✅ Your cast has been scheduled successfully!
          </div>
        )}

        {submitError && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-6 py-6 rounded-lg mb-8 text-xl">
            ❌ {submitError}
          </div>
        )}

        {/* Always show the form - handle authentication separately */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div>
            <label className="block text-xl font-medium text-gray-300 mb-4">
              What's on your mind?
            </label>
            <textarea
              rows={6}
              style={{ backgroundColor: '#374151 !important', color: '#ffffff !important', borderColor: '#4b5563 !important', fontSize: '18px', lineHeight: '1.5' }}
              className={`w-full px-6 py-6 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-lg ${
                !isAuthenticated ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-700 text-white border-gray-600 placeholder-gray-400'
              }`}
              placeholder={isAuthenticated ? "Share your thoughts with the world..." : "Sign in to schedule casts..."}
              maxLength={320}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              disabled={!isAuthenticated}
              {...register('content', { required: 'Content is required' })}
            />
            {errors.content && (
              <p className="text-red-400 text-sm mt-2">
                {errors.content.message}
              </p>
            )}
          </div>

          {/* Media Upload Section */}
          <div>
            <label className="block text-xl font-medium text-gray-300 mb-4">
              Media (optional)
            </label>
            <MediaUpload 
              onFilesChange={setUploadedFiles}
              maxFiles={2} // Farcaster limitation: max 2 embeds per cast
              maxSizePerFile={10 * 1024 * 1024} // 10MB
              className="mb-4"
            />
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-lg font-medium text-gray-300 mb-3">
                Date
              </label>
              <input
                type="date"
                style={{ backgroundColor: '#374151 !important', color: '#ffffff !important', borderColor: '#4b5563 !important', fontSize: '16px', minHeight: '48px', maxWidth: '100%' }}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent box-border ${
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
                style={{ backgroundColor: '#374151 !important', color: '#ffffff !important', borderColor: '#4b5563 !important', fontSize: '16px', minHeight: '48px', maxWidth: '100%' }}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent box-border ${
                  !isAuthenticated ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-700 text-white border-gray-600'
                }`}
                disabled={!isAuthenticated}
                {...register('scheduledTime', { required: 'Time is required' })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xl font-medium text-gray-300 mb-4">
              Channel (optional)
            </label>
            {isAuthenticated && authUser?.fid ? (
              <ChannelSelector
                selectedChannelId={selectedChannelId}
                onChannelSelect={(channelId) => setSelectedChannelId(channelId || undefined)}
                userFid={authUser.fid}
                className="bg-gray-700 border-gray-600"
                limit={100}
                showSearch={true}
              />
            ) : (
              <div className="text-gray-400 text-sm p-4 bg-gray-700 rounded-lg border border-gray-600">
                Sign in to select from your channels
              </div>
            )}
          </div>

          {/* Signer approval check for authenticated users */}
          {isAuthenticated && (
            <SignerApprovalChecker
              fallback={
                <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-4 mb-6">
                  <p className="text-yellow-200 text-sm mb-2">
                    ⚠️ You need to approve your signer to schedule casts
                  </p>
                </div>
              }
            >
              <div className="bg-green-900/50 border border-green-600 rounded-lg p-4 mb-6">
                <p className="text-green-200 text-sm">
                  ✅ Your signer is approved! You can schedule casts.
                </p>
              </div>
            </SignerApprovalChecker>
          )}

          <button
            type="submit"
            disabled={!isAuthenticated || isSubmitting}
            style={{ minHeight: '64px', fontSize: '20px' }}
            className={`w-full py-6 px-8 rounded-lg font-semibold text-xl transition-colors duration-200 ${
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


      </div>
    </div>
  );
} 