"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CodeBadge } from "@/components/code-badge"
import { Button, buttonVariants } from "@/components/ui/button"
import type { FeedbackStatus } from "@/lib/types"
import {
  deleteReportAction,
  updateReportStatusAction,
} from "@/app/admin/reports/actions"
import { formatDate } from "@/lib/report-utils"
import { cn } from "@/lib/utils"

export interface AdminReportItem {
  id: string
  location_id: string | null
  message: string
  status: FeedbackStatus
  created_at: string
  location: {
    id: string
    name: string
    code: string | null
  } | null
}

export interface ReportsTableProps {
  initialReports: AdminReportItem[]
  currentStatus: "open" | "reviewed" | "resolved" | "all"
  currentPage: number
  totalCount: number
  pageSize: number
}

const STATUS_FILTERS: Array<{
  value: "open" | "reviewed" | "resolved" | "all"
  label: string
}> = [
  { value: "open", label: "Open" },
  { value: "reviewed", label: "Reviewed" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
]

export function ReportsTable({
  initialReports,
  currentStatus,
  currentPage,
  totalCount,
  pageSize,
}: ReportsTableProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [activeActionId, setActiveActionId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleStatusChange = (id: string, newStatus: FeedbackStatus) => {
    setError(null)
    setActiveActionId(id)

    startTransition(async () => {
      const result = await updateReportStatusAction(id, newStatus)
      setActiveActionId(null)

      if (!result.success) {
        setError(result.error || "Failed to update report status.")
      } else {
        router.refresh()
      }
    })
  }

  const handleDelete = (report: AdminReportItem) => {
    const confirmation =
      "Are you sure you want to delete this report? This action cannot be undone."
    if (!window.confirm(confirmation)) {
      return
    }

    setError(null)
    setActiveActionId(report.id)

    startTransition(async () => {
      const result = await deleteReportAction(report.id)
      setActiveActionId(null)

      if (!result.success) {
        setError(result.error || "Failed to delete report.")
      } else {
        router.refresh()
      }
    })
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const hasPrevious = currentPage > 1
  const hasNext = currentPage * pageSize < totalCount
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalCount)

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div
          className="flex items-center gap-1.5"
          role="tablist"
          aria-label="Status filters"
        >
          {STATUS_FILTERS.map((filter) => {
            const isActive = currentStatus === filter.value
            return (
              <Link
                key={filter.value}
                href={`/admin/reports?status=${filter.value}`}
                role="tab"
                aria-selected={isActive}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {filter.label}
              </Link>
            )
          })}
        </div>

        <div className="text-xs text-muted-foreground">
          {totalCount === 1 ? "1 report found" : `${totalCount} reports found`}
        </div>
      </div>

      {/* Reports Table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 whitespace-nowrap">
                Created Time
              </th>
              <th scope="col" className="px-4 py-3 whitespace-nowrap">
                Location
              </th>
              <th scope="col" className="px-4 py-3 min-w-[280px]">
                Message
              </th>
              <th scope="col" className="px-4 py-3 whitespace-nowrap">
                Status
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right whitespace-nowrap"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {initialReports.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  No reports found for the selected status.
                </td>
              </tr>
            ) : (
              initialReports.map((report) => {
                const isItemPending = isPending && activeActionId === report.id

                return (
                  <tr
                    key={report.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    {/* Created Time */}
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap align-top">
                      {formatDate(report.created_at)}
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      {report.location ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground">
                              {report.location.name}
                            </span>
                            <CodeBadge code={report.location.code} />
                          </div>
                          <Link
                            href={`/admin/locations/${report.location.id}/edit`}
                            className="text-xs text-primary hover:underline font-medium inline-block"
                          >
                            Edit location ↗
                          </Link>
                        </div>
                      ) : (
                        <span className="italic text-muted-foreground text-xs">
                          Deleted location
                        </span>
                      )}
                    </td>

                    {/* Message */}
                    <td className="px-4 py-3 align-top text-xs text-foreground leading-relaxed break-words">
                      {report.message}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      {report.status === "open" && (
                        <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                          open
                        </span>
                      )}
                      {report.status === "reviewed" && (
                        <span className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                          reviewed
                        </span>
                      )}
                      {report.status === "resolved" && (
                        <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          resolved
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right align-top whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {report.status === "open" && (
                          <>
                            <Button
                              variant="outline"
                              size="xs"
                              disabled={isItemPending}
                              onClick={() =>
                                handleStatusChange(report.id, "reviewed")
                              }
                            >
                              Mark reviewed
                            </Button>
                            <Button
                              variant="outline"
                              size="xs"
                              disabled={isItemPending}
                              onClick={() =>
                                handleStatusChange(report.id, "resolved")
                              }
                            >
                              Mark resolved
                            </Button>
                          </>
                        )}

                        {report.status === "reviewed" && (
                          <>
                            <Button
                              variant="outline"
                              size="xs"
                              disabled={isItemPending}
                              onClick={() =>
                                handleStatusChange(report.id, "resolved")
                              }
                            >
                              Mark resolved
                            </Button>
                            <Button
                              variant="outline"
                              size="xs"
                              disabled={isItemPending}
                              onClick={() =>
                                handleStatusChange(report.id, "open")
                              }
                            >
                              Reopen
                            </Button>
                          </>
                        )}

                        {report.status === "resolved" && (
                          <>
                            <Button
                              variant="outline"
                              size="xs"
                              disabled={isItemPending}
                              onClick={() =>
                                handleStatusChange(report.id, "open")
                              }
                            >
                              Reopen
                            </Button>
                            <Button
                              variant="outline"
                              size="xs"
                              disabled={isItemPending}
                              onClick={() =>
                                handleStatusChange(report.id, "reviewed")
                              }
                            >
                              Mark reviewed
                            </Button>
                          </>
                        )}

                        <Button
                          variant="destructive"
                          size="xs"
                          disabled={isItemPending}
                          onClick={() => handleDelete(report)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground pt-2">
        <div>
          {totalCount > 0 ? (
            <span>
              Showing {startItem} to {endItem} of {totalCount} reports (Page{" "}
              {currentPage} of {totalPages})
            </span>
          ) : (
            <span>0 reports</span>
          )}
        </div>

        <nav
          aria-label="Reports pagination"
          className="flex items-center gap-2"
        >
          {hasPrevious ? (
            <Link
              href={`/admin/reports?status=${currentStatus}&page=${currentPage - 1}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
              aria-label="Previous page"
            >
              Previous
            </Link>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled
              aria-label="Previous page"
            >
              Previous
            </Button>
          )}

          {hasNext ? (
            <Link
              href={`/admin/reports?status=${currentStatus}&page=${currentPage + 1}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
              aria-label="Next page"
            >
              Next
            </Link>
          ) : (
            <Button variant="outline" size="sm" disabled aria-label="Next page">
              Next
            </Button>
          )}
        </nav>
      </div>
    </div>
  )
}
