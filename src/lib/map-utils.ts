import type { Location } from "./types"

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
 * Converts locations with valid coordinates into map markers.
 * Locations with missing or invalid coordinates are excluded from map markers.
 */
export function getMapMarkers(locations: Location[]): MapMarker[] {
  const markers: MapMarker[] = []

  for (const location of locations) {
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
 * Computes bounding coordinates [southWest, northEast] for a set of locations.
 * Returns null if no valid coordinates are available.
 */
export function calculateMapBounds(
  locations: Location[]
): [[number, number], [number, number]] | null {
  const markers = getMapMarkers(locations)
  if (markers.length === 0) {
    return null
  }

  let minLat = markers[0].position[0]
  let maxLat = markers[0].position[0]
  let minLng = markers[0].position[1]
  let maxLng = markers[0].position[1]

  for (let i = 1; i < markers.length; i++) {
    const [lat, lng] = markers[i].position
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
  }

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ]
}

/**
 * Computes a geographic center coordinate from valid location coordinates.
 * Falls back to default campus coordinates if no locations are valid.
 */
export function calculateMapCenter(
  locations: Location[],
  fallbackCenter: [number, number] = DDU_CAMPUS_CENTER
): [number, number] {
  const markers = getMapMarkers(locations)
  if (markers.length === 0) {
    return fallbackCenter
  }

  let sumLat = 0
  let sumLng = 0
  for (const marker of markers) {
    sumLat += marker.position[0]
    sumLng += marker.position[1]
  }

  return [sumLat / markers.length, sumLng / markers.length]
}
