export interface LocationLookupItem {
  id: string
  name: string
  code?: string | null
}

export interface ReportLocationRef {
  id: string
  name: string
  code: string | null
}

/**
 * Attaches location info (id, name, code) to each report item by
 * resolving `location_id` against the list of locations in memory.
 *
 * Behavior:
 * - When location exists in the list, attaches `{ id, name, code }`.
 * - When location_id is null or undefined, attaches `null`.
 * - When location_id is not found in the list, attaches `null`.
 */
export function attachLocationToReports<
  T extends { location_id: string | null },
>(
  reports: T[],
  locations: LocationLookupItem[]
): (T & { location: ReportLocationRef | null })[] {
  const map = new Map<string, LocationLookupItem>()
  for (const loc of locations) {
    map.set(loc.id, loc)
  }

  return reports.map((report) => {
    if (!report.location_id) {
      return {
        ...report,
        location: null,
      }
    }

    const loc = map.get(report.location_id)
    if (!loc) {
      return {
        ...report,
        location: null,
      }
    }

    return {
      ...report,
      location: {
        id: loc.id,
        name: loc.name,
        code: loc.code ?? null,
      },
    }
  })
}

export const REPORT_NOT_FOUND_MESSAGE =
  "That report no longer exists. The list has been refreshed."

export function checkMutationAffectedRow<T>(
  data: T[] | null | undefined
): { affected: true; rows: T[] } | { affected: false; message: string } {
  if (!data || data.length === 0) {
    return { affected: false, message: REPORT_NOT_FOUND_MESSAGE }
  }
  return { affected: true, rows: data }
}

export function clampPageNumber(
  page: string | number | undefined | null
): number {
  if (typeof page === "number") {
    return Number.isInteger(page) && page > 0 ? page : 1
  }
  if (!page || typeof page !== "string") {
    return 1
  }
  const parsed = parseInt(page.trim(), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

export function isPaginationOutOfRangeError(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "code" in error) {
    return (error as { code: unknown }).code === "PGRST103"
  }
  return false
}

export function getResetPaginationUrl(status?: string): string {
  const safeStatus =
    status === "reviewed" || status === "resolved" || status === "all"
      ? status
      : "open"
  return `/admin/reports?status=${safeStatus}&page=1`
}

export const REPORT_TIME_ZONE = "Africa/Addis_Ababa"
export const REPORT_LOCALE = "en-US"
export const INVALID_DATE_FALLBACK = "Unknown date"

export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) {
    return INVALID_DATE_FALLBACK
  }
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) {
    return INVALID_DATE_FALLBACK
  }

  return new Intl.DateTimeFormat(REPORT_LOCALE, {
    timeZone: REPORT_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}
