import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Schedule Cast - Farcaster Mini App',
  description: 'Schedule your Farcaster casts for future posting',
}

export default function MiniAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 