'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import MediaUpload, { UploadedFile } from './MediaUpload';

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

interface EditCastFormData {
  content: string;
  scheduledDate: string;
  scheduledTime: string;
  channelId?: string;
}

interface EditCastModalProps {
  isOpen: boolean;
  onClose: () => void;
  cast: ScheduledCast;
  onSuccess: () => void;
}

export default function EditCastModal({ isOpen, onClose, cast, onSuccess }: EditCastModalProps) {
  const { user: authUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<EditCastFormData>();

  // Initialize form with cast data when modal opens
  useEffect(() => {
    if (isOpen && cast) {
      const scheduledDate = new Date(cast.scheduled_at);
      reset({
        content: cast.content,
        scheduledDate: format(scheduledDate, 'yyyy-MM-dd'),
        scheduledTime: format(scheduledDate, 'HH:mm'),
        channelId: cast.channel_id || ''
      });
      
      // Initialize media files if they exist
      if (cast.media_urls && cast.media_urls.length > 0) {
        const initialFiles: UploadedFile[] = cast.media_urls.map((url, index) => ({
          id: `existing_${index}`,
          url,
          type: cast.media_types?.[index]?.startsWith('image/') ? 'image' : 
                cast.media_types?.[index]?.startsWith('video/') ? 'video' : 'gif',
          filename: `media_${index + 1}`,
          size: 0,
          format: cast.media_types?.[index]?.split('/')[1] || 'jpeg',
          storage_path: url // Use the URL as storage path for existing files
        }));
        setUploadedFiles(initialFiles);
      } else {
        setUploadedFiles([]);
      }
    }
  }, [isOpen, cast, reset]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSubmitError(null);
      setUploadedFiles([]);
    }
  }, [isOpen]);

  const onSubmit = async (data: EditCastFormData) => {
    if (!authUser?.fid) {
      setSubmitError('You must be logged in to edit casts');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const scheduledAt = new Date(`${data.scheduledDate}T${data.scheduledTime}`);
      
      if (scheduledAt <= new Date()) {
        setSubmitError('Scheduled time must be in the future');
        setIsSubmitting(false);
        return;
      }

      const updateData = {
        content: data.content,
        scheduled_at: scheduledAt.toISOString(),
        channel_id: data.channelId || null,
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

      const response = await fetch(`/api/casts/${cast.id}?fid=${authUser.fid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update cast');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating cast:', error);
      setSubmitError((error as Error)?.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  console.log('EditCastModal rendering with isOpen:', isOpen, 'cast:', cast?.id);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" 
      style={{ 
        zIndex: 99999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex'
      }}
      onClick={(e) => {
        console.log('Modal backdrop clicked');
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => {
          console.log('Modal content clicked');
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Edit Scheduled Cast</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isSubmitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {submitError && (
            <div className="bg-red-900 text-red-200 p-4 rounded-lg border border-red-700">
              ❌ {submitError}
            </div>
          )}

          <div>
            <label className="block text-lg font-medium text-gray-300 mb-3">
              What's on your mind?
            </label>
            <textarea
              rows={6}
              className="w-full p-4 border border-gray-600 rounded-lg text-white bg-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              placeholder="Share your thoughts with the world..."
              maxLength={320}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
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
            <label className="block text-lg font-medium text-gray-300 mb-3">
              Media (optional)
            </label>
            <MediaUpload 
              onFilesChange={setUploadedFiles}
              maxFiles={2}
              maxSizePerFile={10 * 1024 * 1024}
              className="mb-4"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-lg font-medium text-gray-300 mb-3">
                Date
              </label>
              <input
                type="date"
                className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              className="w-full p-4 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="e.g. farcaster, crypto, art"
              {...register('channelId')}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-300 hover:text-white transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Updating...' : 'Update Cast'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 