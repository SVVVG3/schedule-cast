'use client';

import { useState } from 'react';
import NeynarSignInButton from '@/components/NeynarSignInButton';

export default function TestSIWNPage() {
  const [authData, setAuthData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = async (data: any) => {
    console.log('SIWN Success:', data);
    setAuthData(data);
    setError(null);
    
    // Test if we can immediately post a cast with this signer
    try {
      const testResponse = await fetch('/api/test-neynar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fid: data.fid,
          content: `Test cast from Schedule-Cast at ${new Date().toISOString()}! SIWN working! 🎉`
        }),
      });
      
      const testResult = await testResponse.json();
      console.log('Test cast result:', testResult);
      
      if (testResult.success) {
        alert('SUCCESS! SIWN is working and we can post casts!');
      } else {
        alert(`SIWN worked but posting failed: ${testResult.error}`);
      }
    } catch (err) {
      console.error('Error testing cast:', err);
      alert(`SIWN worked but test cast failed: ${err}`);
    }
  };

  const handleError = (error: Error) => {
    console.error('SIWN Error:', error);
    setError(error.message);
    setAuthData(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-center mb-6">
            Test SIWN Integration
          </h1>
          
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Click the button below to test Sign In With Neynar:
              </p>
              
              <NeynarSignInButton
                onSuccess={handleSuccess}
                onError={handleError}
                theme="light"
                className="w-full"
              />
            </div>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <strong>Error:</strong> {error}
              </div>
            )}
            
            {authData && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                <h3 className="font-bold mb-2">Authentication Success!</h3>
                <div className="text-sm">
                  <p><strong>FID:</strong> {authData.fid}</p>
                  <p><strong>Signer UUID:</strong> {authData.signer_uuid}</p>
                  <p><strong>Username:</strong> {authData.user?.username || 'N/A'}</p>
                  <p><strong>Display Name:</strong> {authData.user?.displayName || 'N/A'}</p>
                </div>
              </div>
            )}
            
            <div className="text-center">
              <a 
                href="/"
                className="text-purple-600 hover:text-purple-800 text-sm"
              >
                ← Back to main app
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 