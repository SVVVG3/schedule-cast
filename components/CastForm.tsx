'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { useUser } from '@/lib/user-context';
import { useAuth } from '@/lib/auth-context';
import MediaUpload, { UploadedFile } from './MediaUpload';

interface CastFormData {
  content: string;
  scheduledDate: string;
  scheduledTime: string;
  channelId?: string;
}

export default function CastForm() {
  const { supabaseUser } = useUser();
  const { user: authUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CastFormData>({
    defaultValues: {
      content: '',
      scheduledDate: format(new Date(), 'yyyy-MM-dd'),
      scheduledTime: format(new Date(Date.now() + 30 * 60 * 1000), 'HH:mm'), // 30 min from now
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
      // Combine date and time into a single timestamp
      const scheduledAt = new Date(`${data.scheduledDate}T${data.scheduledTime}`);
      
      // Make sure the time is in the future
      if (scheduledAt <= new Date()) {
        setSubmitError('Scheduled time must be in the future');
        setIsSubmitting(false);
        return;
      }

      // Create the cast object
      const castData = {
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

      // Send to API endpoint with FID as query param for authentication
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

      // Success!
      setSubmitSuccess(true);
      reset(); // Clear the form
      setUploadedFiles([]); // Clear uploaded files
    } catch (error) {
      console.error('Error scheduling cast:', error);
      setSubmitError((error as Error)?.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Schedule a Cast</h2>
      
      {submitSuccess && (
        <div className="mb-4 p-3 bg-green-50 text-green-800 rounded border border-green-200">
          Your cast has been scheduled successfully!
        </div>
      )}
      
      {submitError && (
        <div className="mb-4 p-3 bg-red-50 text-red-800 rounded border border-red-200">
          {submitError}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-4">
          <label htmlFor="content" className="block mb-2 text-sm font-medium text-gray-700">
            Cast Content
          </label>
          <textarea
            id="content"
            className={`w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none ${errors.content ? 'border-red-500' : 'border-gray-300'}`}
            rows={3}
            placeholder="What's on your mind?"
            maxLength={320}
            {...register('content', { required: 'Content is required' })}
          />
          {errors.content && (
            <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">Max 320 characters</p>
        </div>

        {/* Media Upload Section */}
        <div className="mb-6">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Media (optional)
          </label>
          <MediaUpload 
            onFilesChange={setUploadedFiles}
            maxFiles={4}
            maxSizePerFile={10 * 1024 * 1024} // 10MB
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="scheduledDate" className="block mb-2 text-sm font-medium text-gray-700">
              Date
            </label>
            <input
              type="date"
              id="scheduledDate"
              className={`w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none ${errors.scheduledDate ? 'border-red-500' : 'border-gray-300'}`}
              {...register('scheduledDate', { required: 'Date is required' })}
            />
            {errors.scheduledDate && (
              <p className="mt-1 text-sm text-red-600">{errors.scheduledDate.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="scheduledTime" className="block mb-2 text-sm font-medium text-gray-700">
              Time
            </label>
            <input
              type="time"
              id="scheduledTime"
              className={`w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none ${errors.scheduledTime ? 'border-red-500' : 'border-gray-300'}`}
              {...register('scheduledTime', { required: 'Time is required' })}
            />
            {errors.scheduledTime && (
              <p className="mt-1 text-sm text-red-600">{errors.scheduledTime.message}</p>
            )}
          </div>
        </div>
        
        <div className="mb-6">
          <label htmlFor="channelId" className="block mb-2 text-sm font-medium text-gray-700">
            Channel (optional)
          </label>
          <input
            type="text"
            id="channelId"
            className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-lg focus:outline-none"
            placeholder="Enter channel ID"
            {...register('channelId')}
          />
          <p className="mt-1 text-xs text-gray-500">Leave blank to post to your main feed</p>
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-2 px-4 rounded-lg text-white font-medium ${
            isSubmitting ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {isSubmitting ? 'Scheduling...' : 'Schedule Cast'}
        </button>
      </form>
    </div>
  );
} 