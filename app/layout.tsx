import './globals.css'
import type { Metadata } from 'next'
import { AuthProvider } from '@/lib/auth-context'
import { UserProvider } from '@/lib/user-context'
import ImprovedNavbar from '@/components/ImprovedNavbar'

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
        <AuthProvider>
          <UserProvider>
            <div className="min-h-screen flex flex-col">
              <ImprovedNavbar />
              <main className="flex-grow">{children}</main>
              <footer className="bg-gray-100 py-4 border-t">
                <div className="container mx-auto px-4 text-center text-sm text-gray-600">
                  <p>Schedule Cast - A Farcaster Mini App</p>
                </div>
              </footer>
            </div>
          </UserProvider>
        </AuthProvider>
      </body>
    </html>
  )
} 