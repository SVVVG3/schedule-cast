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
    <div style={{ 
      backgroundColor: 'white', 
      padding: '20px', 
      borderRadius: '8px', 
      border: '1px solid #e5e7eb',
      maxWidth: '500px',
      width: '100%',
      margin: '0 auto'
    }}>
      <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 'bold' }}>
        Schedule a Cast (Simple Version)
      </h3>

      {submitSuccess && (
        <div style={{ 
          backgroundColor: '#f0fdf4', 
          color: '#166534', 
          padding: '10px', 
          borderRadius: '4px',
          marginBottom: '16px' 
        }}>
          ✅ Your cast has been scheduled successfully!
        </div>
      )}

      {submitError && (
        <div style={{ 
          backgroundColor: '#fef2f2', 
          color: '#991b1b', 
          padding: '10px', 
          borderRadius: '4px',
          marginBottom: '16px' 
        }}>
          ❌ {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
            What's on your mind?
          </label>
          <textarea
            rows={4}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px'
            }}
            placeholder="Share your thoughts with the world..."
            maxLength={320}
            {...register('content', { required: 'Content is required' })}
          />
          {errors.content && (
            <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
              {errors.content.message}
            </p>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Date
            </label>
            <input
              type="date"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px'
              }}
              {...register('scheduledDate', { required: 'Date is required' })}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Time
            </label>
            <input
              type="time"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px'
              }}
              {...register('scheduledTime', { required: 'Time is required' })}
            />
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
            Channel (optional)
          </label>
          <input
            type="text"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px'
            }}
            placeholder="e.g. farcaster, crypto, art"
            {...register('channelId')}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: isSubmitting ? '#9ca3af' : '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: isSubmitting ? 'not-allowed' : 'pointer'
          }}
        >
          {isSubmitting ? 'Scheduling...' : 'Schedule Cast'}
        </button>
      </form>
    </div>
  );
} 