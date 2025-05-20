'use client';

import { useState, useEffect } from 'react';

export default function SupabaseStatus() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function checkSupabaseStatus() {
      try {
        const response = await fetch('/api/auth/session');
        
        if (!response.ok) {
          const data = await response.json();
          setStatus('error');
          setErrorMessage(data.error || 'Failed to connect to Supabase');
          return;
        }
        
        setStatus('connected');
      } catch (error) {
        setStatus('error');
        setErrorMessage('Failed to connect to API');
      }
    }

    checkSupabaseStatus();
  }, []);

  return (
    <div className="mt-4 text-center">
      <p className="text-sm">
        Supabase Status:{' '}
        {status === 'loading' && <span className="text-yellow-500">Checking connection...</span>}
        {status === 'connected' && <span className="text-green-500">Connected</span>}
        {status === 'error' && <span className="text-red-500">Error: {errorMessage}</span>}
      </p>
    </div>
  );
} 