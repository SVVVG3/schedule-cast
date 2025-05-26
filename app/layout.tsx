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
  description: 'Plan and schedule your Farcaster casts for optimal engagement. Schedule posts in advance and never miss a beat.',
  openGraph: {
    title: 'Schedule Cast',
    description: 'Plan and schedule your Farcaster casts for optimal engagement',
    images: ['https://schedule-cast.vercel.app/ScheduleCastEmbed.png'],
    url: 'https://schedule-cast.vercel.app'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta 
          name="fc:frame" 
          content='{"version":"1","imageUrl":"https://schedule-cast.vercel.app/ScheduleCastEmbed.png","button":{"title":"📅 Schedule Cast","action":{"type":"launch_frame","name":"Schedule Cast","url":"https://schedule-cast.vercel.app/miniapp","splashImageUrl":"https://schedule-cast.vercel.app/ScheduleCastLogo.png","splashBackgroundColor":"#000000"}}}' 
        />
      </head>
      <body className="overflow-x-hidden w-full max-w-full">
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