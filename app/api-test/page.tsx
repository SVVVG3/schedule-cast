/**
 * This section has been updated to display the signer approval URL to users
 * and explain the delegation process
 */

'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/lib/user-context';
import NeynarSignInButton from '@/components/NeynarSignInButton';

// SIWN callback function - defined outside component to make it globally accessible
declare global {
  interface Window {
    onSignInSuccess: (data: any) => void;
  }
}

export default function ApiTestPage() {
  const { authenticated, ready, user: privyUser } = usePrivy();
  const { isLoading, supabaseUser } = useUser();
  const [content, setContent] = useState('');
  const [channelId, setChannelId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [userResult, setUserResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [siwnResult, setSiwnResult] = useState<any>(null);

  // Debug auth and user state
  useEffect(() => {
    console.log('Privy Auth State:', { authenticated, ready, hasFarcaster: !!privyUser?.farcaster });
    console.log('Supabase User State:', { isLoading, supabaseUser });
  }, [authenticated, ready, privyUser, isLoading, supabaseUser]);

  // Handler for SIWN success
  const handleNeynarSignInSuccess = async (data: any) => {
    console.log("Sign-in success with data:", data);
    setSiwnResult(data);
    
    // Store the signer in your database
    try {
      if (data.fid && data.signer_uuid) {
        // Save to your database
        const response = await fetch('/api/signer/store', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fid: data.fid,
            signer_uuid: data.signer_uuid,
            // Include any other user data you received
            username: data.user?.username,
            display_name: data.user?.displayName
          }),
        });
        
        const responseData = await response.json();
        if (!response.ok) {
          throw new Error(responseData.error || 'Failed to store signer');
        }
        
        console.log('Signer stored successfully:', responseData);
      }
    } catch (err) {
      console.error('Error storing signer:', err);
      setError((err as Error).message || 'Failed to store signer');
    }
  };

  if (!authenticated || !ready || isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold mb-4">API Test</h1>
        <p className="text-gray-600">Please log in to test the API.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      console.log('Submit with user data:', { supabaseUser, privyFarcaster: privyUser?.farcaster });
      
      // Get FID from Supabase user or fall back to Privy Farcaster FID
      let fid = supabaseUser?.fid;
      
      // If no FID in Supabase user, try to get it from Privy
      if (!fid && privyUser?.farcaster?.fid) {
        console.log('Using Farcaster FID directly from Privy:', privyUser.farcaster.fid);
        fid = privyUser.farcaster.fid;
      }
      
      if (!fid) {
        throw new Error('No Farcaster ID found for user');
      }

      const response = await fetch('/api/test-neynar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fid: fid,
          content,
          channel_id: channelId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to post cast');
      }

      setResult(data);
    } catch (err) {
      console.error('Error testing API:', err);
      setError((err as Error).message || 'An unexpected error occurred');
      
      // If we get specific error information from the server, use it
      if ((err as any).cause?.response) {
        try {
          const errorData = await (err as any).cause.response.json();
          if (errorData.debug_info) {
            setResult({
              error: errorData.error,
              debug_info: errorData.debug_info,
              signer_uuid: errorData.signer_uuid
            });
          }
        } catch (e) {
          // Ignore JSON parsing errors
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Function to test creating a user in the database
  const handleCreateUser = async () => {
    if (!privyUser?.farcaster?.fid) {
      setError('No Farcaster ID available to create user');
      return;
    }
    
    setIsCreatingUser(true);
    setError(null);
    setUserResult(null);
    
    try {
      console.log('Creating test user with FID:', privyUser.farcaster.fid);
      
      const response = await fetch('/api/test-user-insert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fid: privyUser.farcaster.fid,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }
      
      setUserResult(data);
      console.log('User creation result:', data);
    } catch (err) {
      console.error('Error creating user:', err);
      setError((err as Error).message || 'Failed to create user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">Neynar API Test</h1>
      
      <div className="bg-yellow-50 p-4 rounded-lg mb-6 border border-yellow-200">
        <p className="text-yellow-800 text-sm">
          <strong>Note:</strong> This page is for development testing only. It allows you to post to Farcaster using the Neynar API.
        </p>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-800 rounded border border-red-200">
          Error: {error}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-medium mb-2">Sign in with Neynar (SIWN)</h2>
        <p className="text-sm text-gray-600 mb-4">Connect your Farcaster account with write access using Neynar.</p>
        
        <NeynarSignInButton 
          onSuccess={handleNeynarSignInSuccess}
          onError={(err) => setError(err.message)}
          theme="dark"
          className="mb-4"
        />
        
        {siwnResult && (
          <div className="mt-3 p-3 bg-green-50 text-green-800 rounded border border-green-200 text-sm">
            <p className="font-medium">Connected with Neynar Successfully!</p>
            <p>FID: {siwnResult.fid}</p>
            <p>Signer UUID: {siwnResult.signer_uuid}</p>
            {siwnResult.user && (
              <>
                <p>Username: {siwnResult.user.username}</p>
                <p>Display Name: {siwnResult.user.displayName}</p>
              </>
            )}
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-medium mb-2">Debugging Tools</h2>
        <p className="text-sm text-gray-600 mb-4">Use these tools to debug Supabase authentication issues.</p>
        
        <button
          onClick={handleCreateUser}
          disabled={isCreatingUser || !privyUser?.farcaster?.fid}
          className={`w-full py-2 px-4 mb-4 rounded-lg text-white font-medium ${
            isCreatingUser || !privyUser?.farcaster?.fid
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isCreatingUser ? 'Creating User...' : 'Create/Update Test User'}
        </button>
        
        {userResult && (
          <div className="mt-3 p-3 bg-blue-50 text-blue-800 rounded border border-blue-200 text-sm">
            <p className="font-medium">User Created/Updated Successfully</p>
            <p>FID: {userResult.user?.fid}</p>
            <p>Signer UUID: {userResult.user?.signer_uuid ? userResult.user.signer_uuid : 'None'}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-medium mb-4">Post a Test Cast</h2>
        
        {result && result.requires_delegation && (
          <div className="mb-4 p-4 bg-yellow-50 text-yellow-800 rounded border border-yellow-200">
            <h3 className="font-bold mb-2">Signer Delegation Required</h3>
            <p className="mb-2">{result.message}</p>
            <ol className="list-decimal pl-5 mb-3 space-y-1">
              <li>Click the approval link below</li>
              <li>Approve the signer in your Farcaster client</li>
              <li>Return to this page to post casts</li>
            </ol>
            <a 
              href={result.signer_approval_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full text-center py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium mt-2"
            >
              Approve Signer
            </a>
            <p className="text-xs mt-3">Signer UUID: {result.signer_uuid}</p>
          </div>
        )}
        
        {result && result.possible_fallback_url && (
          <div className="mb-4 p-4 bg-orange-50 text-orange-800 rounded border border-orange-200">
            <h3 className="font-bold mb-2">⚠️ Official Approval URL Not Available</h3>
            <p className="mb-2">{result.message}</p>
            <p className="mb-2">We'll try a fallback approval URL, but it may not work:</p>
            <a 
              href={result.possible_fallback_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full text-center py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium mt-2"
            >
              Try Fallback Approval URL
            </a>
            <p className="text-xs mt-3 italic">Note: {result.note}</p>
            <p className="text-xs mt-1">Signer UUID: {result.signer_uuid}</p>
          </div>
        )}
        
        {result && result.error && !result.possible_fallback_url && (
          <div className="mb-4 p-3 bg-red-50 text-red-800 rounded border border-red-200">
            <h3 className="font-bold">Error</h3>
            <p>{result.error}</p>
            {result.debug_info && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm">Debug Info</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(result.debug_info, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
        
        {result && result.success && !result.requires_delegation && (
          <div className="mb-4 p-3 bg-green-50 text-green-800 rounded border border-green-200">
            Cast posted successfully!
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="content" className="block mb-2 text-sm font-medium text-gray-700">
              Cast Content
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              rows={3}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="channelId" className="block mb-2 text-sm font-medium text-gray-700">
              Channel ID (optional)
            </label>
            <input
              id="channelId"
              type="text"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="e.g. product/schedule-cast"
            />
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting || !content}
            className={`w-full py-2 px-4 rounded-lg text-white font-medium ${
              isSubmitting || !content
                ? 'bg-purple-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {isSubmitting ? 'Posting...' : 'Post Test Cast'}
          </button>
        </form>
      </div>
      
      {result && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-4">API Response</h2>
          {result.error && (
            <div className="mb-4 p-3 bg-red-50 text-red-800 rounded border border-red-200">
              <p className="font-bold">Error</p>
              <p>{result.error}</p>
              {result.debug_info && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm">Debug Info</summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(result.debug_info, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
          <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-80">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 