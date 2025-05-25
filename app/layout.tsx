import './globals.css'
import '@neynar/react/dist/style.css'
import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/lib/auth-context'
import { UserProvider } from '@/lib/user-context'
import { FrameContextProvider } from '@/lib/frame-context'
import ConditionalLayout from '@/components/ConditionalLayout'
import NeynarProvider from '@/components/NeynarProvider'

export const metadata: Metadata = {
  title: 'Schedule Cast - Farcaster Scheduling',
  description: 'Schedule your Farcaster casts for future posting',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="overflow-x-hidden">
        <NeynarProvider>
          <FrameContextProvider>
            <AuthProvider>
              <UserProvider>
                <ConditionalLayout>
                  {children}
                </ConditionalLayout>
              </UserProvider>
            </AuthProvider>
          </FrameContextProvider>
        </NeynarProvider>
      </body>
    </html>
  )
} 