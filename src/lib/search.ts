import type { Location } from "./types"

/**
 * Normalizes a location code by converting to lowercase and stripping
 * spaces and dashes so variations like "b002", "B 002", and "b-002" match.
 */
export function normalizeCode(code: string | null | undefined): string {
  if (!code) return ""
  return code.toLowerCase().replace(/[\s-]+/g, "")
}

/**
 * Matches locations against a search query across name, description, and code.
 * Exact code matches rank first in the result set.
 */
export function searchLocations(
  locations: Location[],
  query: string
): Location[] {
  const trimmed = query.trim()
  if (!trimmed) {
    return []
  }

  const textQuery = trimmed.toLowerCase()
  const codeQuery = normalizeCode(trimmed)

  interface RankedLocation {
    location: Location
    rank: number
  }

  const results: RankedLocation[] = []

  for (const location of locations) {
    const normLocationCode = normalizeCode(location.code)

    const isExactCode =
      Boolean(location.code) &&
      codeQuery.length > 0 &&
      normLocationCode === codeQuery

    const isPartialCode =
      Boolean(location.code) &&
      codeQuery.length > 0 &&
      normLocationCode.includes(codeQuery)

    const isNameMatch = location.name.toLowerCase().includes(textQuery)

    const isDescriptionMatch = Boolean(
      location.description &&
      location.description.toLowerCase().includes(textQuery)
    )

    if (isExactCode) {
      results.push({ location, rank: 1 })
    } else if (isPartialCode) {
      results.push({ location, rank: 2 })
    } else if (isNameMatch) {
      results.push({ location, rank: 3 })
    } else if (isDescriptionMatch) {
      results.push({ location, rank: 4 })
    }
  }

  results.sort((a, b) => a.rank - b.rank)

  return results.map((r) => r.location)
}
