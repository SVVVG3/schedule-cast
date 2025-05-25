'use client';

import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/frame-sdk';

interface ManagedSignerHandlerProps {
  fid: number;
  onSignerApproved?: (signerUuid: string) => void;
}

interface ManagedSigner {
  signer_uuid: string;
  status: 'pending' | 'approved' | 'revoked';
  signer_approval_url?: string;
  approved_at?: string;
}

export default function ManagedSignerHandler({ fid, onSignerApproved }: ManagedSignerHandlerProps) {
  const [signer, setSigner] = useState<ManagedSigner | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Check if user already has an approved signer
  useEffect(() => {
    checkExistingSigner();
  }, [fid]);

  const checkExistingSigner = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/signer/check-managed-status?fid=${fid}`);
      const data = await response.json();
      
      if (data.success && data.has_approved_signer) {
        setSigner({
          signer_uuid: data.signer_uuid,
          status: 'approved',
          approved_at: data.approved_at
        });
        onSignerApproved?.(data.signer_uuid);
      }
    } catch (error) {
      console.error('Error checking existing signer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createManagedSigner = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[ManagedSignerHandler] Creating managed signer for FID:', fid);
      
      const response = await fetch('/api/signer/create-managed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fid }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create managed signer');
      }

      setSigner({
        signer_uuid: data.signer_uuid,
        status: data.status,
        signer_approval_url: data.signer_approval_url
      });

      // If already approved, notify parent
      if (data.status === 'approved') {
        onSignerApproved?.(data.signer_uuid);
      } else {
        // Start polling for approval
        startPollingForApproval(data.signer_uuid);
      }

    } catch (error) {
      console.error('Error creating managed signer:', error);
      setError(error instanceof Error ? error.message : 'Failed to create posting permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const startPollingForApproval = (signerUuid: string) => {
    setIsPolling(true);
    
    const poll = async () => {
      try {
        const response = await fetch('/api/signer/check-managed-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ signer_uuid: signerUuid }),
        });

        const data = await response.json();
        
        if (data.success && data.status === 'approved') {
          setSigner(prev => prev ? { ...prev, status: 'approved', approved_at: data.approved_at } : null);
          setIsPolling(false);
          onSignerApproved?.(signerUuid);
          return;
        }
        
        // Continue polling if still pending
        if (data.success && data.status === 'pending') {
          setTimeout(poll, 3000); // Poll every 3 seconds
        } else {
          setIsPolling(false);
          setError('Signer approval failed or was revoked');
        }

      } catch (error) {
        console.error('Error checking signer status:', error);
        setTimeout(poll, 5000); // Retry in 5 seconds on error
      }
    };

    poll();
  };

  const openApprovalUrl = async () => {
    if (!signer?.signer_approval_url) return;
    
    try {
      // Use Frame SDK to open URL in mini app context
      await sdk.actions.openUrl(signer.signer_approval_url);
    } catch (error) {
      console.error('Error opening approval URL:', error);
      // Fallback to regular window.open
      window.open(signer.signer_approval_url, '_blank');
    }
  };

  if (isLoading && !signer) {
    return (
      <div className="p-4 border border-gray-200 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (signer?.status === 'approved') {
    return (
      <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
          <span className="text-green-800 font-medium">
            Posting permissions approved ✓
          </span>
        </div>
        <p className="text-sm text-green-600 mt-1">
          You can now schedule casts for automatic posting
        </p>
      </div>
    );
  }

  if (signer?.status === 'pending') {
    return (
      <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 bg-yellow-500 rounded-full animate-pulse"></div>
          <span className="text-yellow-800 font-medium">
            Approval Required
          </span>
        </div>
        
        <p className="text-sm text-yellow-700 mb-3">
          Grant posting permissions to schedule casts for automatic posting.
        </p>
        
        <button
          onClick={openApprovalUrl}
          disabled={!signer.signer_approval_url}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 mb-2"
        >
          {isPolling ? 'Approve in Warpcast...' : 'Grant Posting Permissions'}
        </button>
        
        {isPolling && (
          <p className="text-xs text-yellow-600 text-center">
            Waiting for approval...
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <h3 className="font-medium text-gray-900 mb-2">
        Posting Permissions Required
      </h3>
      
      <p className="text-sm text-gray-600 mb-3">
        To schedule casts for automatic posting, you need to grant posting permissions.
      </p>
      
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">
          {error}
        </div>
      )}
      
      <button
        onClick={createManagedSigner}
        disabled={isLoading}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Setting up...' : 'Grant Posting Permissions'}
      </button>
    </div>
  );
} 