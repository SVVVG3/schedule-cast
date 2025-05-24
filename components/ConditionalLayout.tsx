'use client';

import { useFrameContext } from '@/lib/frame-context';
import ImprovedNavbar from './ImprovedNavbar';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const { isFrameApp, isLoading } = useFrameContext();

  // Show loading state while frame context is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Frame/Mini app layout - no navbar, simplified
  if (isFrameApp) {
    return <>{children}</>;
  }

  // Regular web layout - with navbar and footer
  return (
    <div className="min-h-screen flex flex-col">
      <ImprovedNavbar />
      <main className="flex-grow">{children}</main>
      <footer className="bg-gray-800 py-4 border-t border-gray-700">
        <div className="container mx-auto px-4 text-center text-sm text-gray-300">
          <p>Schedule Cast - A Farcaster Mini App</p>
        </div>
      </footer>
    </div>
  );
} 