"use client"

import { useState } from "react"
import { Check, Share2 } from "lucide-react"
import type { Location } from "@/lib/types"
import { useLanguage } from "@/components/language-provider"
import { translations } from "@/lib/i18n"
import type { TranslationDictionary } from "@/lib/i18n"

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

  let t: TranslationDictionary = translations.en
  try {
    const langCtx = useLanguage()
    t = langCtx.t
  } catch {
    // outside provider
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const shareUrl = getLocationShareUrl(location)

    if (
      typeof navigator !== "undefined" &&
      navigator.share &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ url: shareUrl })
    ) {
      try {
        await navigator.share({
          title: `${location.name} - DDU Campus Guide`,
          text: location.description || `Find ${location.name} on the DDU Campus Map`,
          url: shareUrl,
        })
        return
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") {
          return
        }
      }
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl)
      } else if (typeof document !== "undefined") {
        const input = document.createElement("input")
        input.value = shareUrl
        document.body.appendChild(input)
        input.select()
        document.execCommand("copy")
        document.body.removeChild(input)
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
            {t.linkCopied}
          </span>
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t.share}</span>
        </>
      )}
    </button>
  )
}
