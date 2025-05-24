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
            const redirectUri = encodeURIComponent('https://schedule-cast.vercel.app/siwn-bridge');
            const siwnUrl = `https://app.neynar.com/login?client_id=${clientId}&redirect_uri=${redirectUri}`;
            
            // Navigate the entire mini app to SIWN
            window.location.href = siwnUrl;
          }}
          className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center justify-center space-x-2"
        >
          <span>🔐</span>
          <span>Continue with Neynar</span>
        </button>
      </div>
    </div>
  );
} 