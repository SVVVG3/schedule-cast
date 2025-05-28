'use client';

import { useState } from 'react';

interface NotificationFormData {
  title: string;
  body: string;
  target_url: string;
  target_fids: string; // comma-separated FIDs, empty for all users
}

export default function NotificationAdmin() {
  const [formData, setFormData] = useState<NotificationFormData>({
    title: '',
    body: '',
    target_url: 'https://schedule-cast.vercel.app/miniapp',
    target_fids: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      // Parse target FIDs if provided
      const targetFids = formData.target_fids
        ? formData.target_fids.split(',').map(fid => parseInt(fid.trim(), 10)).filter(fid => !isNaN(fid))
        : [];

      const requestBody = {
        target_fids: targetFids.length > 0 ? targetFids : undefined,
        notification: {
          title: formData.title,
          body: formData.body,
          target_url: formData.target_url
        }
      };

      console.log('[NotificationAdmin] Sending notification:', requestBody);

      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('fid') || ''}`
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, message: 'Notification sent successfully!' });
        // Reset form
        setFormData({
          title: '',
          body: '',
          target_url: 'https://schedule-cast.vercel.app/miniapp',
          target_fids: ''
        });
      } else {
        setResult({ success: false, message: data.error || 'Failed to send notification' });
      }
    } catch (error: any) {
      console.error('[NotificationAdmin] Error:', error);
      setResult({ success: false, message: error.message || 'Network error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof NotificationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
      <h2 className="text-xl font-bold text-white mb-4">📨 Send Notification</h2>
      <p className="text-gray-300 text-sm mb-6">
        Send notifications to users who have added Schedule Cast to their mini apps.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-200 text-sm font-medium mb-2">
            Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="🪐 New feature available!"
            required
            maxLength={50}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">Max 50 characters</p>
        </div>

        <div>
          <label className="block text-gray-200 text-sm font-medium mb-2">
            Message *
          </label>
          <textarea
            value={formData.body}
            onChange={(e) => handleInputChange('body', e.target.value)}
            placeholder="Schedule Cast now supports media uploads! Click to check it out."
            required
            maxLength={200}
            rows={3}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">Max 200 characters</p>
        </div>

        <div>
          <label className="block text-gray-200 text-sm font-medium mb-2">
            Target URL *
          </label>
          <input
            type="url"
            value={formData.target_url}
            onChange={(e) => handleInputChange('target_url', e.target.value)}
            placeholder="https://schedule-cast.vercel.app/miniapp"
            required
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">Where users will be taken when they tap the notification</p>
        </div>

        <div>
          <label className="block text-gray-200 text-sm font-medium mb-2">
            Target FIDs (Optional)
          </label>
          <input
            type="text"
            value={formData.target_fids}
            onChange={(e) => handleInputChange('target_fids', e.target.value)}
            placeholder="123, 456, 789 (leave empty for all users)"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">Comma-separated FIDs to target specific users</p>
        </div>

        {result && (
          <div className={`rounded-lg p-3 ${result.success ? 'bg-green-900 border border-green-600' : 'bg-red-900 border border-red-600'}`}>
            <p className={`text-sm ${result.success ? 'text-green-200' : 'text-red-200'}`}>
              {result.message}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !formData.title || !formData.body || !formData.target_url}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center justify-center space-x-2">
              <span className="animate-spin">⏳</span>
              <span>Sending Notification...</span>
            </span>
          ) : (
            '📨 Send Notification'
          )}
        </button>
      </form>
    </div>
  );
} 