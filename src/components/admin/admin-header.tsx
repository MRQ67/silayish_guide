import Link from "next/link"
import { logoutAction } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"

export interface AdminHeaderProps {
  userEmail?: string
}

export function AdminHeader({ userEmail }: AdminHeaderProps) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/locations"
            className="text-lg font-bold tracking-tight text-foreground hover:opacity-80"
          >
            Campus Guide Admin
          </Link>
          <span className="hidden rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground sm:inline-block">
            Locations
          </span>
        </div>

        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {userEmail}
            </span>
          )}
          <Link href="/" target="_blank" className="text-xs text-muted-foreground hover:text-foreground">
            View Map ↗
          </Link>
          <form action={logoutAction}>
            <Button variant="outline" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
