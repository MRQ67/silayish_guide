"use client"

import { useSyncExternalStore } from "react"
import { Globe } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

const emptySubscribe = () => () => {}

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, toggleLocale } = useLanguage()
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle language"
        className={`inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-semibold text-muted-foreground ${className}`}
        disabled
      >
        <Globe className="h-3.5 w-3.5" />
        <span>EN</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={
        locale === "en" ? "ቋንቋ ወደ አማርኛ ቀይር" : "Switch language to English"
      }
      title={locale === "en" ? "አማርኛ (Amharic)" : "English"}
      data-testid="language-toggle"
      className={`inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
    >
      <Globe className="h-3.5 w-3.5" />
      <span>{locale === "en" ? "አማ" : "EN"}</span>
    </button>
  )
}
