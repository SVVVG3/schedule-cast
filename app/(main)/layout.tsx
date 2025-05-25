import type { Metadata } from 'next'

// Mini App Embed configuration
const embedFrame = {
  version: "next",
  imageUrl: "https://schedule-cast.vercel.app/ScheduleCastEmbed.png",
  button: {
    title: "📅 Schedule Cast",
    action: {
      type: "launch_frame",
      name: "Schedule Cast",
      url: "https://schedule-cast.vercel.app/miniapp",
      splashImageUrl: "https://schedule-cast.vercel.app/api/splash-logo",
      splashBackgroundColor: "#000000"
    }
  }
}

export const metadata: Metadata = {
  other: {
    "fc:frame": JSON.stringify(embedFrame)
  }
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 