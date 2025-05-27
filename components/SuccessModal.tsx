'use client';

import { useEffect, useState } from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  castData: {
    content: string;
    scheduledAt: string;
    channelName?: string;
    hasMedia: boolean;
  };
  onScheduleAnother: () => void;
}

export default function SuccessModal({ 
  isOpen, 
  onClose, 
  castData, 
  onScheduleAnother 
}: SuccessModalProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Delay showing content for smooth animation
      const timer = setTimeout(() => setShowContent(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatScheduledTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Container - Centered */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className={`relative transform rounded-2xl border p-8 shadow-2xl transition-all duration-300 w-full max-w-md ${
            showContent ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
          style={{ 
            backgroundColor: '#1f2937', 
            borderColor: '#4b5563'
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-300 text-2xl"
            style={{ color: '#9ca3af' }}
          >
            ×
          </button>

          {/* Success animation and content */}
          <div className="text-center">
            {/* Celebration emoji with animation */}
            <div className="mb-6">
              <div className="text-6xl animate-bounce">🎉</div>
            </div>

            {/* Main heading */}
            <h2 className="text-2xl font-bold text-white mb-2">
              Cast Scheduled Successfully!
            </h2>

            {/* Subheading with scheduled time */}
            <p className="text-gray-300 mb-4">
              Your cast is ready to go live
            </p>

            {/* Simplified scheduled time display */}
            <div className="text-purple-400 text-lg font-medium mb-8">
              {formatScheduledTime(castData.scheduledAt)}
            </div>

            {/* Single action button */}
            <button
              onClick={onScheduleAnother}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Schedule Another Cast
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 