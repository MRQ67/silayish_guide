import type { Location } from "./types"
import {
  calculateOutlineCenter,
  haversineDistanceMeters,
} from "./validations/outline"

export interface ParentRef {
  id: string
  name: string
  code?: string | null
}

export interface LocationWithParentRelation {
  id: string
  name: string
  parent_id?: string | null
  code?: string | null
}

/**
 * Attaches parent building info (id, name, code) to each location item by
 * resolving `parent_id` against the list of locations in memory.
 *
 * Behavior:
 * - When parent exists in the list, attaches `{ id, name, code }`.
 * - When parent_id is null or undefined, attaches `null`.
 * - When parent_id is not found in the list, attaches `null`.
 */
export function attachParentNames<T extends LocationWithParentRelation>(
  locations: T[]
): (T & { parent: ParentRef | null })[] {
  const map = new Map<string, LocationWithParentRelation>()
  for (const loc of locations) {
    map.set(loc.id, loc)
  }

  return locations.map((loc) => {
    if (!loc.parent_id) {
      return {
        ...loc,
        parent: null,
      }
    }

    const parent = map.get(loc.parent_id)
    if (!parent) {
      return {
        ...loc,
        parent: null,
      }
    }

    return {
      ...loc,
      parent: {
        id: parent.id,
        name: parent.name,
        code: parent.code ?? null,
      },
    }
  })
}

/**
 * Extracts effective geographical coordinates for a location,
 * falling back to outline centroid or parent building coordinates.
 */
export function getLocationEffectiveCoordinates(
  loc: Location,
  allLocations?: Location[]
): { lat: number; lng: number } | null {
  if (loc.lat != null && loc.lng != null) {
    return { lat: loc.lat, lng: loc.lng }
  }
  if (loc.outline) {
    try {
      return calculateOutlineCenter(loc.outline)
    } catch {
      // ignore outline parsing errors
    }
  }
  if (loc.parent_id && allLocations) {
    const parent = allLocations.find((l) => l.id === loc.parent_id)
    if (parent) {
      if (parent.lat != null && parent.lng != null) {
        return { lat: parent.lat, lng: parent.lng }
      }
      if (parent.outline) {
        try {
          return calculateOutlineCenter(parent.outline)
        } catch {
          // ignore
        }
      }
    }
  }
  return null
}

/**
 * Calculates distance in meters between user coordinates and a location.
 */
export function getLocationDistanceMeters(
  loc: Location,
  userCoords: [number, number] | null | undefined,
  allLocations?: Location[]
): number | null {
  if (!userCoords) return null
  const coords = getLocationEffectiveCoordinates(loc, allLocations)
  if (!coords) return null
  return haversineDistanceMeters(
    userCoords[0],
    userCoords[1],
    coords.lat,
    coords.lng
  )
}
