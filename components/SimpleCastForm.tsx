'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { useUser } from '@/lib/user-context';
import { useAuth } from '@/lib/auth-context';
import MediaUpload, { UploadedFile } from './MediaUpload';
import ChannelSelector from './ChannelSelector';
import SuccessModal from './SuccessModal';

interface CastFormData {
  content: string;
  scheduledDate: string;
  scheduledTime: string;
  channelId?: string;
}

interface SimpleCastFormProps {
  onCastScheduled?: () => void; // Callback to refresh scheduled casts list
}

export default function SimpleCastForm({ onCastScheduled }: SimpleCastFormProps) {
  const { supabaseUser } = useUser();
  const { user: authUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | undefined>(undefined);
  const [selectedChannelName, setSelectedChannelName] = useState<string | undefined>(undefined);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastScheduledCast, setLastScheduledCast] = useState<{
    content: string;
    scheduledAt: string;
    channelName?: string;
    hasMedia: boolean;
  } | null>(null);
  
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
        channel_id: selectedChannelId,
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

              // Prepare success modal data
        setLastScheduledCast({
          content: data.content,
          scheduledAt: scheduledAt.toISOString(),
          channelName: selectedChannelName,
          hasMedia: uploadedFiles.length > 0
        });

      // Show success modal instead of banner
      setShowSuccessModal(true);
      
      // Trigger refresh of scheduled casts list
      if (onCastScheduled) {
        onCastScheduled();
      }

              // Clear form
        reset();
        setUploadedFiles([]); // Clear uploaded files
        setSelectedChannelId(undefined); // Clear selected channel
        setSelectedChannelName(undefined); // Clear selected channel name
    } catch (error) {
      console.error('Error scheduling cast:', error);
      setSubmitError((error as Error)?.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg w-full" style={{ backgroundColor: '#1f2937 !important', color: '#ffffff !important', borderColor: '#374151 !important', maxWidth: '1000px', margin: '0 auto' }}>

      {/* Success Modal */}
      {lastScheduledCast && (
        <SuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            setSubmitSuccess(false);
            setLastScheduledCast(null); // Clear the modal data
          }}
          castData={lastScheduledCast}
          onScheduleAnother={() => {
            setShowSuccessModal(false);
            setSubmitSuccess(false);
            setLastScheduledCast(null); // Clear the modal data
            // Form is already cleared, just focus on content textarea
            const textarea = document.querySelector('textarea');
            if (textarea) textarea.focus();
          }}
        />
      )}

      {submitError && (
        <div className="bg-red-900 text-red-200 p-6 rounded-lg mb-8 border border-red-700 text-xl">
          ❌ {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-xl font-medium text-gray-300 mb-4">
            What's on your mind?
          </label>
          <textarea
            rows={6}
            style={{ backgroundColor: '#374151 !important', color: '#ffffff !important', borderColor: '#4b5563 !important', fontSize: '18px', lineHeight: '1.5' }}
            className="w-full p-6 border border-gray-600 rounded-lg text-lg resize-none bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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

        {/* Media Upload Section */}
        <div className="mb-6">
          <label className="block text-lg font-medium text-gray-300 mb-3">
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
              className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent box-border"
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
              style={{ backgroundColor: '#374151 !important', color: '#ffffff !important', borderColor: '#4b5563 !important', fontSize: '16px', minHeight: '48px', maxWidth: '100%' }}
              className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent box-border"
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
          <label className="block text-xl font-medium text-gray-300 mb-4">
            Channel (optional)
          </label>
          {authUser?.fid ? (
            <ChannelSelector
              selectedChannelId={selectedChannelId}
              onChannelSelect={(channelId) => {
                setSelectedChannelId(channelId || undefined);
                // For now, we'll store a simple placeholder
                // TODO: Enhance ChannelSelector to also return channel name
                setSelectedChannelName(channelId ? 'Selected Channel' : undefined);
              }}
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

        <button
          type="submit"
          disabled={isSubmitting}
          style={{ minHeight: '64px', fontSize: '20px' }}
          className={`w-full py-6 px-8 rounded-lg text-white font-semibold text-xl transition-colors ${
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