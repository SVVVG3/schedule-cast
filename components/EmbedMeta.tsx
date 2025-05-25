'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

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

export default function EmbedMeta() {
  const pathname = usePathname()
  
  useEffect(() => {
    // Only add fc:frame meta tag for non-miniapp pages
    const shouldAddEmbed = !pathname.startsWith('/miniapp')
    
    // Remove existing fc:frame meta tag if it exists
    const existingMeta = document.querySelector('meta[name="fc:frame"]')
    if (existingMeta) {
      existingMeta.remove()
    }
    
    // Add the meta tag if this is not a miniapp page
    if (shouldAddEmbed) {
      const meta = document.createElement('meta')
      meta.name = 'fc:frame'
      meta.content = JSON.stringify(embedFrame)
      document.head.appendChild(meta)
    }
  }, [pathname])

  return null
} 