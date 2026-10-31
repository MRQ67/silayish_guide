"use client"

import Link from "next/link"
import { Compass } from "lucide-react"
import { LanguageToggle } from "@/components/language-toggle"
import { ThemeToggle } from "@/components/theme-toggle"
import { useLanguage } from "@/components/language-provider"

export function Header() {
  const { t } = useLanguage()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight text-foreground"
        >
          <Compass className="h-5 w-5 text-primary" />
          <span className="text-sm font-bold sm:text-lg">{t.appName}</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
          <span className="hidden md:inline font-medium">{t.subTitle}</span>
          <LanguageToggle />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
