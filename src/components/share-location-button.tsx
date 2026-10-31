"use client"

import { useState } from "react"
import { Check, Share2 } from "lucide-react"
import type { Location } from "@/lib/types"

export interface ShareLocationButtonProps {
  location: Location
  className?: string
}

export function getLocationShareUrl(location: Location): string {
  const param = location.code || location.id
  if (typeof window !== "undefined") {
    const url = new URL(window.location.href)
    url.searchParams.set("location", param)
    return url.toString()
  }
  return `/?location=${encodeURIComponent(param)}`
}

export function ShareLocationButton({
  location,
  className = "",
}: ShareLocationButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const shareUrl = getLocationShareUrl(location)

    if (
      typeof navigator !== "undefined" &&
      navigator.share &&
      /mobile|android|iphone|ipad/i.test(navigator.userAgent)
    ) {
      try {
        await navigator.share({
          title: `${location.name} - DDU Campus Guide`,
          text: `Check out ${location.name} on the Dire Dawa University Campus Guide`,
          url: shareUrl,
        })
        return
      } catch {
        // Fall back to clipboard if user cancels share or it fails
      }
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea")
        textarea.value = shareUrl
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore clipboard write failure
    }
  }

  return (
    <button
      type="button"
      data-testid="share-location-button"
      onClick={handleShare}
      aria-label={`Share link for ${location.name}`}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span className="font-medium text-primary" aria-live="polite">
            Link copied!
          </span>
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Share</span>
        </>
      )}
    </button>
  )
}
