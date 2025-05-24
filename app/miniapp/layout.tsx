import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Schedule Cast - Farcaster Mini App',
  description: 'Schedule your Farcaster casts for future posting',
  openGraph: {
    title: 'Schedule Cast',
    description: 'Plan and schedule your Farcaster casts for optimal engagement',
    images: [{
      url: 'https://schedule-cast.vercel.app/ScheduleCastEmbed.png',
      width: 1200,
      height: 800,
      alt: 'Schedule Cast - Farcaster Scheduling App'
    }],
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://schedule-cast.vercel.app/ScheduleCastEmbed.png',
    'fc:frame:button:1': '📅 Open Schedule Cast',
    'fc:frame:post_url': 'https://schedule-cast.vercel.app/miniapp',
  }
}

export default function MiniAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 