'use client';

import { useState } from 'react';
import sdk from '@farcaster/frame-sdk';

// Types from the Neynar documentation - updated for addMiniApp
type FrameNotificationDetails = {
  url: string;
  token: string;
};

type AddMiniAppResult =
  | {
      added: true;
      notificationDetails?: FrameNotificationDetails;
    }
  | {
      added: false;
      reason: 'invalid_domain_manifest' | 'rejected_by_user';
    };

interface NotificationManagerProps {
  onNotificationEnabled?: (enabled: boolean, details?: FrameNotificationDetails) => void;
}

export default function NotificationManager({ onNotificationEnabled }: NotificationManagerProps) {
  const [isAdded, setIsAdded] = useState(false);
  const [notificationDetails, setNotificationDetails] = useState<FrameNotificationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddMiniApp = async () => {
    if (isAdded) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('[NotificationManager] Attempting to add mini app...');
      
      const result = await sdk.actions.addMiniApp() as AddMiniAppResult;
      
      console.log('[NotificationManager] Add mini app result:', result);

      if (result.added) {
        setIsAdded(true);
        console.log('[NotificationManager] Mini app added successfully!');
        
        if (result.notificationDetails) {
          setNotificationDetails(result.notificationDetails);
          onNotificationEnabled?.(true, result.notificationDetails);
          console.log('[NotificationManager] Notifications enabled:', result.notificationDetails);
        }
      } else {
        const errorMsg = result.reason === 'rejected_by_user' 
          ? 'You declined to add the mini app. Please try again if you want to enable notifications.'
          : 'Unable to add mini app. Please check your app manifest.';
        
        setError(errorMsg);
        console.log('[NotificationManager] Failed to add mini app:', result.reason);
      }
    } catch (err: any) {
      const errorMsg = 'Failed to add mini app. You may not be in a supported Farcaster client.';
      setError(errorMsg);
      console.error('[NotificationManager] Error adding mini app:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isAdded) {
    return (
      <div className="bg-green-900 border border-green-600 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <span className="text-green-400">✅</span>
          <span className="text-green-200">
            Mini app added! {notificationDetails ? 'Notifications enabled.' : 'Notifications not enabled.'}
          </span>
        </div>
        {notificationDetails && (
          <div className="mt-2 text-xs text-green-300">
            You'll receive notifications about your scheduled casts.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-blue-900 border border-blue-600 rounded-lg p-4">
      <div className="space-y-3">
        <div className="flex items-start space-x-2">
          <span className="text-blue-400 mt-0.5">🔔</span>
          <div>
            <h3 className="text-blue-200 font-medium">Enable Notifications</h3>
            <p className="text-blue-300 text-sm mt-1">
              Add Schedule Cast to your mini apps to receive notifications about your scheduled casts.
            </p>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-900 border border-red-600 rounded p-2">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}
        
        <button
          onClick={handleAddMiniApp}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center justify-center space-x-2">
              <span className="animate-spin">⏳</span>
              <span>Adding Mini App...</span>
            </span>
          ) : (
            '📱 Add to Mini Apps & Enable Notifications'
          )}
        </button>
        
        <p className="text-xs text-blue-400">
          This will prompt you to add Schedule Cast to your mini apps and enable notifications.
        </p>
      </div>
    </div>
  );
} 