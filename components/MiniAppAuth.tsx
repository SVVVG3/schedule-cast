'use client';

import { useFrameContext } from '@/lib/frame-context';

interface MiniAppAuthProps {
  className?: string;
}

export default function MiniAppAuth({ className = '' }: MiniAppAuthProps) {
  const { frameContext, isMiniApp } = useFrameContext();

  if (!isMiniApp || !frameContext?.user) {
    return null;
  }

  return (
    <div className={`flex flex-col space-y-3 ${className}`}>
      <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-4">
        <p className="text-blue-200 text-sm mb-3">
          Sign in with Neynar to get posting permissions for scheduling casts.
        </p>
        <button
          onClick={() => {
            const clientId = process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || '3bc04533-6297-438b-8d85-e655f3fc19f9';
            const redirectUri = encodeURIComponent('https://schedule-cast.vercel.app/api/siwn-complete');
            const siwnUrl = `https://app.neynar.com/login?client_id=${clientId}&redirect_uri=${redirectUri}`;
            
            // Open in external browser
            window.open(siwnUrl, '_blank');
          }}
          className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center justify-center space-x-2"
        >
          <span>🌐</span>
          <span>Open Neynar Authentication</span>
        </button>
        <div className="mt-3">
          <button
            onClick={() => {
              // Check auth status after external SIWN
              if (frameContext?.user?.fid) {
                fetch(`/api/debug-user?fid=${frameContext.user.fid}`)
                  .then(res => res.json())
                  .then(data => {
                    if (data.has_signer && data.is_delegated) {
                      // Refresh the page to update auth state
                      window.location.reload();
                    } else {
                      alert('Authentication not detected yet. Please try again or complete the authentication process.');
                    }
                  })
                  .catch(() => {
                    alert('Error checking authentication status.');
                  });
              }
            }}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
          >
            ✅ I completed authentication - Check Status
          </button>
        </div>
      </div>
    </div>
  );
} 