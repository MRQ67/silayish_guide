import { redirect } from "next/navigation"
import { connection } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { handleAdminReportError, handleLocationError } from "@/lib/errors"
import {
  attachLocationToReports,
  clampPageNumber,
  getResetPaginationUrl,
  isPaginationOutOfRangeError,
  type LocationLookupItem,
} from "@/lib/report-utils"
import type { FeedbackReport } from "@/lib/types"
import { AdminHeader } from "@/components/admin/admin-header"
import {
  ReportsTable,
  type AdminReportItem,
} from "@/components/admin/reports-table"

export const instant = false

const PAGE_SIZE = 50

interface AdminReportsPageProps {
  searchParams: Promise<{
    status?: string
    page?: string
  }>
}

export default async function AdminReportsPage({
  searchParams,
}: AdminReportsPageProps) {
  await connection()
  const { supabase, user } = await requireAdmin()

  const resolvedSearchParams = await searchParams
  const rawStatus = resolvedSearchParams.status
  const currentStatus: "open" | "reviewed" | "resolved" | "all" =
    rawStatus === "reviewed" || rawStatus === "resolved" || rawStatus === "all"
      ? rawStatus
      : "open"

  const currentPage = clampPageNumber(resolvedSearchParams.page)
  const offset = (currentPage - 1) * PAGE_SIZE

  let reports: AdminReportItem[] = []
  let totalCount = 0
  let openCount = 0
  let errorMessage: string | null = null
  let redirectTarget: string | null = null

  try {
    // 1. Fetch total count of open reports for header badge
    const { count: openReportsCount } = await supabase
      .from("feedback_reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "open")
    openCount = openReportsCount ?? 0

    // 2. Query 1: Fetch reports matching the active filter and pagination (newest first)
    let query = supabase
      .from("feedback_reports")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })

    if (currentStatus !== "all") {
      query = query.eq("status", currentStatus)
    }

    const {
      data: rawReports,
      count: filteredCount,
      error: reportsError,
    } = await query.range(offset, offset + PAGE_SIZE - 1)

    if (reportsError) {
      if (isPaginationOutOfRangeError(reportsError)) {
        redirectTarget = getResetPaginationUrl(currentStatus)
      } else {
        errorMessage = handleAdminReportError(
          reportsError,
          "We couldn't load feedback reports right now. Please try again later.",
          "[admin] reports query failed"
        )
      }
    } else {
      totalCount = filteredCount ?? 0

      // 3. Query 2: Load needed locations in a separate query and join them in code
      // (avoiding PostgREST relationship embeds)
      const rawReportsList = (rawReports as unknown as FeedbackReport[]) || []
      const locationIds = Array.from(
        new Set(
          rawReportsList
            .map((r) => r.location_id)
            .filter((id): id is string => Boolean(id))
        )
      )

      let locations: LocationLookupItem[] = []
      if (locationIds.length > 0) {
        const { data: locationsData, error: locationsError } = await supabase
          .from("locations")
          .select("id, name, code")
          .in("id", locationIds)

        if (locationsError) {
          handleLocationError(
            locationsError,
            "[admin] locations lookup for reports failed"
          )
        } else if (locationsData) {
          locations = locationsData
        }
      }

      // Join reports and locations in code
      reports = attachLocationToReports(rawReportsList, locations)
    }
  } catch (err) {
    if (isPaginationOutOfRangeError(err)) {
      redirectTarget = getResetPaginationUrl(currentStatus)
    } else {
      errorMessage = handleAdminReportError(
        err,
        "We couldn't load feedback reports right now. Please try again later.",
        "[admin] reports load exception"
      )
    }
  }

  if (redirectTarget) {
    redirect(redirectTarget)
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <AdminHeader
        userEmail={user.email}
        openReportsCount={openCount}
        activeSection="reports"
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Feedback Reports
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review user-submitted issue reports and location update requests.
          </p>
        </div>

        {errorMessage ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          >
            {errorMessage}
          </div>
        ) : (
          <ReportsTable
            initialReports={reports}
            currentStatus={currentStatus}
            currentPage={currentPage}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
          />
        )}
      </main>
    </div>
  )
}
