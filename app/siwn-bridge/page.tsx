'use client';

import { useEffect, useState } from 'react';

export default function SIWNBridgePage() {
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const handleSIWNCompletion = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const authCode = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        
        console.log('[SIWN Bridge] Received params:', { authCode, state, error });
        
        if (error) {
          setStatus(`❌ Authentication error: ${error}`);
          setTimeout(() => {
            window.location.href = `/miniapp?siwn_error=${error}`;
          }, 2000);
          return;
        }
        
        if (authCode) {
          setStatus('✅ Authorization code received! Exchanging for access token...');
          
          // Exchange authorization code for access token using our API
          const response = await fetch('/api/auth/exchange-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              code: authCode,
              state: state 
            })
          });
          
          const result = await response.json();
          console.log('[SIWN Bridge] Token exchange result:', result);
          
          if (response.ok && result.success) {
            setStatus('✅ Authentication complete! Redirecting to app...');
            
            // Redirect to mini app with success
            setTimeout(() => {
              window.location.href = '/miniapp?siwn_complete=true';
            }, 1000);
          } else {
            setStatus(`❌ Token exchange failed: ${result.error || 'Unknown error'}`);
            setTimeout(() => {
              window.location.href = '/miniapp?siwn_error=token_exchange_failed';
            }, 2000);
          }
        } else {
          setStatus('❌ Missing authorization code');
          setTimeout(() => {
            window.location.href = '/miniapp?siwn_error=missing_code';
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