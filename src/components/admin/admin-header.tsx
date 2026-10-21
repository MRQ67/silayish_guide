import Link from "next/link"
import { logoutAction } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

export interface AdminHeaderProps {
  userEmail?: string
  openReportsCount?: number
  activeSection?: "locations" | "reports"
}

export async function AdminHeader({
  userEmail,
  openReportsCount,
  activeSection,
}: AdminHeaderProps) {
  let count = openReportsCount
  if (count === undefined) {
    try {
      const supabase = await createClient()
      const { count: c } = await supabase
        .from("feedback_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "open")
      count = c ?? 0
    } catch {
      count = 0
    }
  }

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/admin/locations"
            className="text-lg font-bold tracking-tight text-foreground hover:opacity-80"
          >
            Campus Guide Admin
          </Link>

          <nav
            className="flex items-center gap-1.5 text-xs font-medium"
            aria-label="Admin Navigation"
          >
            <Link
              href="/admin/locations"
              className={cn(
                "rounded-md px-2.5 py-1 transition-colors",
                activeSection === "locations"
                  ? "bg-muted font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              Locations
            </Link>
            <Link
              href="/admin/reports"
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors",
                activeSection === "reports"
                  ? "bg-muted font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <span>Reports</span>
              {typeof count === "number" && (
                <span
                  data-testid="open-reports-count"
                  className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
                >
                  {count}
                </span>
              )}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {userEmail}
            </span>
          )}
          <Link
            href="/"
            target="_blank"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
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
