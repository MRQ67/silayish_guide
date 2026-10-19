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
export function attachLocationToReports<T extends { location_id: string | null }>(
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
