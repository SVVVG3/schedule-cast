import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Schedule Cast - Farcaster Scheduling',
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
      "imageUrl": "https://yoink.party/framesV2/opengraph-image",
      "button": {
        "title": "📅 Schedule Cast",
        "action": {
          "type": "launch_frame",
          "url": "https://schedule-cast.vercel.app/miniapp",
          "name": "Schedule Cast",
          "splashImageUrl": "https://schedule-cast.vercel.app/ScheduleCastLogo.png",
          "splashBackgroundColor": "#000000"
        }
      }
    })
  }
}

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 