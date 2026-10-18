import type { MultiPolygon, Polygon } from "@/lib/types"

export interface OutlineValidationResult {
  valid: boolean
  geometry?: Polygon | MultiPolygon
  error?: string
}

/**
 * Calculates Haversine distance in meters between two lat/lng coordinates.
 */
export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000 // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Extracts a GeoJSON Polygon or MultiPolygon geometry from a pasted geometry,
 * Feature, or FeatureCollection containing exactly one feature.
 */
export function extractGeoJsonGeometry(
  input: unknown
): { geometry?: Polygon | MultiPolygon; error?: string } {
  if (input === null || input === undefined || input === "") {
    return { error: "No GeoJSON provided" }
  }

  let parsed: unknown = input
  if (typeof input === "string") {
    const trimmed = input.trim()
    if (!trimmed) {
      return { error: "No GeoJSON provided" }
    }
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      return { error: "Invalid JSON format" }
    }
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { error: "GeoJSON must be an object" }
  }

  const obj = parsed as Record<string, unknown>

  if (obj.type === "FeatureCollection") {
    if (!Array.isArray(obj.features)) {
      return { error: "FeatureCollection must contain a features array" }
    }
    if (obj.features.length !== 1) {
      return {
        error: "FeatureCollection must contain exactly one feature",
      }
    }
    const firstFeature = obj.features[0] as Record<string, unknown> | null
    if (
      !firstFeature ||
      typeof firstFeature !== "object" ||
      firstFeature.type !== "Feature" ||
      !firstFeature.geometry ||
      typeof firstFeature.geometry !== "object"
    ) {
      return { error: "FeatureCollection feature has no valid geometry" }
    }
    return extractGeoJsonGeometry(firstFeature.geometry)
  }

  if (obj.type === "Feature") {
    if (!obj.geometry || typeof obj.geometry !== "object") {
      return { error: "Feature has no geometry" }
    }
    return extractGeoJsonGeometry(obj.geometry)
  }

  if (obj.type === "Polygon" || obj.type === "MultiPolygon") {
    return { geometry: obj as unknown as Polygon | MultiPolygon }
  }

  return {
    error: "GeoJSON must be a Polygon, MultiPolygon, Feature, or single-feature FeatureCollection",
  }
}

/**
 * Validates ring structure, closed state, position count, and coordinate ranges.
 * Coordinates must be [longitude, latitude] with longitude in [-180, 180] and latitude in [-90, 90].
 */
export function validateOutlineGeometry(
  geometry: Polygon | MultiPolygon
): { valid: boolean; error?: string } {
  if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") {
    return {
      valid: false,
      error: "Geometry type must be Polygon or MultiPolygon",
    }
  }

  const polygons: number[][][][] =
    geometry.type === "Polygon"
      ? [geometry.coordinates as number[][][]]
      : (geometry.coordinates as number[][][][])

  if (!Array.isArray(polygons) || polygons.length === 0) {
    return { valid: false, error: "Polygon coordinates array cannot be empty" }
  }

  for (const poly of polygons) {
    if (!Array.isArray(poly) || poly.length === 0) {
      return { valid: false, error: "Polygon must contain at least one ring" }
    }

    for (const ring of poly) {
      if (!Array.isArray(ring)) {
        return { valid: false, error: "Ring must be an array of positions" }
      }
      if (ring.length < 4) {
        return {
          valid: false,
          error: "Each polygon ring must have at least 4 positions",
        }
      }

      // First and last coordinates must be identical
      const first = ring[0]
      const last = ring[ring.length - 1]
      if (
        !Array.isArray(first) ||
        !Array.isArray(last) ||
        first.length < 2 ||
        last.length < 2 ||
        first[0] !== last[0] ||
        first[1] !== last[1]
      ) {
        return {
          valid: false,
          error: "Ring is not closed: the first and last positions must be identical",
        }
      }

      for (const pos of ring) {
        if (!Array.isArray(pos) || pos.length < 2) {
          return {
            valid: false,
            error: "Coordinate position must have at least two numbers: [longitude, latitude]",
          }
        }
        const [lng, lat] = pos
        if (
          typeof lng !== "number" ||
          typeof lat !== "number" ||
          Number.isNaN(lng) ||
          Number.isNaN(lat)
        ) {
          return { valid: false, error: "Coordinate values must be valid numbers" }
        }
        if (lng < -180 || lng > 180) {
          return {
            valid: false,
            error: `Longitude ${lng} is out of range [-180, 180]`,
          }
        }
        if (lat < -90 || lat > 90) {
          return {
            valid: false,
            error: `Latitude ${lat} is out of range [-90, 90]`,
          }
        }
      }
    }
  }

  return { valid: true }
}

/**
 * Calculates the center [lat, lng] of an outline geometry.
 */
export function calculateOutlineCenter(
  geometry: Polygon | MultiPolygon
): { lat: number; lng: number } {
  const polygons: number[][][][] =
    geometry.type === "Polygon"
      ? [geometry.coordinates as number[][][]]
      : (geometry.coordinates as number[][][][])

  let minLng = Infinity
  let maxLng = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity

  for (const poly of polygons) {
    for (const ring of poly) {
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng
        if (lng > maxLng) maxLng = lng
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
      }
    }
  }

  return {
    lat: (minLat + maxLat) / 2,
    lng: (minLng + maxLng) / 2,
  }
}

/**
 * Computes bounding coordinates [[south, west], [north, east]] for an outline.
 */
export function calculateOutlineBounds(
  geometry: Polygon | MultiPolygon
): [[number, number], [number, number]] {
  const polygons: number[][][][] =
    geometry.type === "Polygon"
      ? [geometry.coordinates as number[][][]]
      : (geometry.coordinates as number[][][][])

  let minLng = Infinity
  let maxLng = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity

  for (const poly of polygons) {
    for (const ring of poly) {
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng
        if (lng > maxLng) maxLng = lng
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
      }
    }
  }

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ]
}

/**
 * Full validation pure function:
 * 1. Accepts GeoJSON geometry, Feature, or FeatureCollection (as object or JSON string).
 * 2. Extracts geometry.
 * 3. Enforces Polygon / MultiPolygon, closed rings with >= 4 positions, valid ranges.
 * 4. If location coordinates are given, verifies outline center is within 1 km.
 */
export function validateOutline(
  input: unknown,
  locationCoords?: { lat?: number | null; lng?: number | null }
): OutlineValidationResult {
  if (input === null || input === undefined || input === "") {
    return { valid: true }
  }

  if (typeof input === "string" && input.trim() === "") {
    return { valid: true }
  }

  const extraction = extractGeoJsonGeometry(input)
  if (!extraction.geometry || extraction.error) {
    return {
      valid: false,
      error: extraction.error || "Invalid GeoJSON structure",
    }
  }

  const geometry = extraction.geometry
  const geomValidation = validateOutlineGeometry(geometry)
  if (!geomValidation.valid) {
    return {
      valid: false,
      error: geomValidation.error,
    }
  }

  if (
    locationCoords &&
    typeof locationCoords.lat === "number" &&
    typeof locationCoords.lng === "number" &&
    !Number.isNaN(locationCoords.lat) &&
    !Number.isNaN(locationCoords.lng)
  ) {
    const center = calculateOutlineCenter(geometry)
    const distance = haversineDistanceMeters(
      locationCoords.lat,
      locationCoords.lng,
      center.lat,
      center.lng
    )

    if (distance > 1000) {
      return {
        valid: false,
        error:
          "Outline center is more than 1 km from the location coordinates. The coordinates may be swapped or the outline belongs to another place.",
      }
    }
  }

  return {
    valid: true,
    geometry,
  }
}
