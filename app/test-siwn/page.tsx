'use client';

import { useState, useEffect } from 'react';
import { NeynarAuthButton } from '@neynar/react';
import { useAuth } from '@/lib/auth-context';

export default function TestSIWNPage() {
  const [authData, setAuthData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();

  // Monitor auth changes to detect when SIWN completes
  useEffect(() => {
    if (isAuthenticated && user) {
      setAuthData(user);
      setError(null);
      
      // Test if we can immediately post a cast with this signer
      const testCast = async () => {
        try {
          const testResponse = await fetch('/api/test-neynar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fid: user.fid,
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
      
      testCast();
    }
  }, [isAuthenticated, user]);

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-center mb-6">
            Test SIWN Integration
          </h1>
          
          <div className="space-y-4">
            {!isAuthenticated ? (
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Click the button below to test Sign In With Neynar:
                </p>
                
                <NeynarAuthButton
                  label="Sign in with Neynar"
                />
              </div>
            ) : (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                <h3 className="font-bold mb-2">Authentication Success!</h3>
                <div className="text-sm">
                  <p><strong>FID:</strong> {user?.fid}</p>
                  <p><strong>Signer UUID:</strong> {user?.signer_uuid}</p>
                  <p><strong>Username:</strong> {user?.username || 'N/A'}</p>
                  <p><strong>Display Name:</strong> {user?.displayName || 'N/A'}</p>
                </div>
              </div>
            )}
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <strong>Error:</strong> {error}
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