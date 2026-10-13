import Link from "next/link"
import { Compass } from "lucide-react"

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <Compass className="h-5 w-5 text-primary" />
          <span className="text-base sm:text-lg">DDU Campus Guide</span>
        </Link>
        <nav className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground">
          <span className="hidden sm:inline">Dire Dawa University</span>
        </nav>
      </div>
    </header>
  )
}
