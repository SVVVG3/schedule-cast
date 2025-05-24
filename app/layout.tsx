import './globals.css'
import type { Metadata } from 'next'
import { AuthProvider } from '@/lib/auth-context'
import { UserProvider } from '@/lib/user-context'
import { FrameContextProvider } from '@/lib/frame-context'
import ConditionalLayout from '@/components/ConditionalLayout'

export const metadata: Metadata = {
  title: 'Schedule Cast - Farcaster Scheduling',
  description: 'Schedule your Farcaster casts for future posting',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <FrameContextProvider>
          <AuthProvider>
            <UserProvider>
              <ConditionalLayout>
                {children}
              </ConditionalLayout>
            </UserProvider>
          </AuthProvider>
        </FrameContextProvider>
      </body>
    </html>
  )
} 