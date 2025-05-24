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
    'fc:frame': JSON.stringify({
      "version": "next",
      "imageUrl": "https://schedule-cast.vercel.app/ScheduleCastEmbed.png",
      "button": {
        "title": "📅 Schedule Cast",
        "action": {
          "type": "launch_frame",
          "name": "Schedule Cast",
          "url": "https://schedule-cast.vercel.app/miniapp",
          "splashImageUrl": "https://schedule-cast.vercel.app/ScheduleCastLogo.png",
          "splashBackgroundColor": "#000000"
        }
      }
    })
  }
}

export default function MiniAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 