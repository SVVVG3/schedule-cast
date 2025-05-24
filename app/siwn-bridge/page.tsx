'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SIWNBridgePage() {
  const [status, setStatus] = useState('Processing authentication...');
  const router = useRouter();

  useEffect(() => {
    const handleSIWNCompletion = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const fid = urlParams.get('fid');
        const signer_uuid = urlParams.get('signer_uuid');
        const username = urlParams.get('username');
        const display_name = urlParams.get('display_name');
        
        console.log('[SIWN Bridge] Received params:', { fid, signer_uuid, username, display_name });
        
        if (fid && signer_uuid) {
          setStatus('✅ Authentication successful! Saving data...');
          
          // Call our API to store the data
          const response = await fetch('/api/siwn-complete?' + urlParams.toString());
          const result = await response.text();
          
          console.log('[SIWN Bridge] API call result:', result);
          
          setStatus('✅ Complete! Redirecting to app...');
          
          // Redirect to mini app with success
          setTimeout(() => {
            window.location.href = '/miniapp?siwn_complete=true';
          }, 1000);
        } else {
          setStatus('❌ Missing authentication data');
          setTimeout(() => {
            window.location.href = '/miniapp?siwn_error=missing_data';
          }, 2000);
        }
      } catch (error) {
        console.error('[SIWN Bridge] Error:', error);
        setStatus('❌ Authentication failed');
        setTimeout(() => {
          window.location.href = '/miniapp?siwn_error=bridge_error';
        }, 2000);
      }
    };

    handleSIWNCompletion();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
      <div className="bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-700 text-center max-w-sm mx-auto">
        <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-white mb-4">Schedule Cast</h2>
        <p className="text-gray-300 text-sm">{status}</p>
      </div>
    </div>
  );
} 