'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Delay showing content for smooth animation
      const timer = setTimeout(() => setShowContent(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  if (!isOpen || !isMounted) return null;

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

  const modalContent = (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Backdrop - clicking outside closes modal */}
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={`relative bg-gray-800 rounded-3xl shadow-2xl transition-all duration-300 w-full max-w-lg ${
          showContent ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        style={{ 
          backgroundColor: '#1f2937',
          border: '2px solid #4b5563',
          padding: '2.5rem'
        }}
        onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-200 text-3xl font-light transition-colors"
          style={{ 
            lineHeight: '1',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>

        {/* Success animation and content */}
        <div className="text-center" style={{ paddingTop: '1rem' }}>
          {/* Celebration emoji with animation */}
          <div className="mb-8">
            <div className="text-7xl animate-bounce">🎉</div>
          </div>

          {/* Main heading */}
          <h2 className="text-3xl font-bold text-white mb-4">
            Cast Scheduled Successfully!
          </h2>

          {/* Subheading */}
          <p className="text-gray-300 text-lg mb-6">
            Your cast is ready to go live
          </p>

          {/* Simplified scheduled time display */}
          <div 
            className="text-purple-400 text-xl font-medium mb-10 px-4 py-3 rounded-xl"
            style={{ 
              backgroundColor: 'rgba(147, 51, 234, 0.1)',
              border: '1px solid rgba(147, 51, 234, 0.3)'
            }}
          >
            {formatScheduledTime(castData.scheduledAt)}
          </div>

          {/* Single action button */}
          <button
            onClick={onScheduleAnother}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-8 rounded-xl transition-colors text-lg shadow-lg hover:shadow-xl"
          >
            Schedule Another Cast
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
} 