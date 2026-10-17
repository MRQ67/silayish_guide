import type { Location } from "./types"
import {
  calculateOutlineBounds,
  calculateOutlineCenter,
} from "./validations/outline"

export const DDU_CAMPUS_CENTER: [number, number] = [9.6178, 41.8362]

export interface MapMarker {
  id: string
  position: [number, number]
  location: Location
}

/**
 * Validates whether the given latitude and longitude represent valid geographic coordinates.
 */
export function isValidCoordinate(
  lat: number | null | undefined,
  lng: number | null | undefined
): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") {
    return false
  }
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return false
  }
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

/**
 * Converts locations without outlines into map markers.
 * - Locations with an outline are rendered as outlines, not pins.
 * - A location with a parent that has an outline is not drawn separately.
 * - Locations with missing or invalid coordinates are excluded.
 */
export function getMapMarkers(
  locations: Location[],
  allLocations?: Location[]
): MapMarker[] {
  const lookup = new Map<string, Location>()
  if (allLocations) {
    for (const loc of allLocations) {
      lookup.set(loc.id, loc)
    }
  } else {
    for (const loc of locations) {
      lookup.set(loc.id, loc)
    }
  }

  const markers: MapMarker[] = []

  for (const location of locations) {
    // Locations with an outline keep no pin
    if (location.outline) {
      continue
    }

    // A location with a parent that has an outline is not drawn separately
    if (location.parent_id) {
      const parent = lookup.get(location.parent_id)
      if (parent?.outline) {
        continue
      }
    }

    if (
      isValidCoordinate(location.lat, location.lng) &&
      typeof location.lat === "number" &&
      typeof location.lng === "number"
    ) {
      markers.push({
        id: location.id,
        position: [location.lat, location.lng],
        location,
      })
    }
  }

  return markers
}

/**
 * Computes bounding coordinates [southWest, northEast] across both markers and outlines.
 * Returns null if no valid coordinates are available.
 */
export function calculateMapBounds(
  locations: Location[]
): [[number, number], [number, number]] | null {
  let minLat: number | null = null
  let maxLat: number | null = null
  let minLng: number | null = null
  let maxLng: number | null = null

  const extend = (lat: number, lng: number) => {
    if (minLat === null || lat < minLat) minLat = lat
    if (maxLat === null || lat > maxLat) maxLat = lat
    if (minLng === null || lng < minLng) minLng = lng
    if (maxLng === null || lng > maxLng) maxLng = lng
  }

  for (const loc of locations) {
    if (loc.outline) {
      const bounds = calculateOutlineBounds(loc.outline)
      extend(bounds[0][0], bounds[0][1])
      extend(bounds[1][0], bounds[1][1])
    } else if (
      isValidCoordinate(loc.lat, loc.lng) &&
      typeof loc.lat === "number" &&
      typeof loc.lng === "number"
    ) {
      extend(loc.lat, loc.lng)
    }
  }

  if (minLat === null || maxLat === null || minLng === null || maxLng === null) {
    return null
  }

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ]
}

/**
 * Computes a geographic center coordinate from valid location coordinates and outline centers.
 * Falls back to default campus coordinates if no locations are valid.
 */
export function calculateMapCenter(
  locations: Location[],
  fallbackCenter: [number, number] = DDU_CAMPUS_CENTER
): [number, number] {
  let sumLat = 0
  let sumLng = 0
  let count = 0

  for (const loc of locations) {
    if (loc.outline) {
      const center = calculateOutlineCenter(loc.outline)
      sumLat += center.lat
      sumLng += center.lng
      count++
    } else if (
      isValidCoordinate(loc.lat, loc.lng) &&
      typeof loc.lat === "number" &&
      typeof loc.lng === "number"
    ) {
      sumLat += loc.lat
      sumLng += loc.lng
      count++
    }
  }

  if (count === 0) {
    return fallbackCenter
  }

  return [sumLat / count, sumLng / count]
}
