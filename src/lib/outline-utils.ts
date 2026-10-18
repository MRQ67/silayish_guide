import type { MultiPolygon, Polygon } from "@/lib/types"
import polylabel from "polylabel"

export interface OutlineStyle {
  color: string
  weight: number
  opacity: number
  fillColor: string
  fillOpacity: number
}

/**
 * Palette mapping for categories on top of CARTO Positron light basemap.
 */
export function getCategoryColors(categoryNameOrId?: string | null): {
  stroke: string
  fill: string
  strokeSelected: string
} {
  const norm = (categoryNameOrId || "").toLowerCase().trim()
  if (norm.includes("academic")) {
    return { stroke: "#1d4ed8", fill: "#3b82f6", strokeSelected: "#1e40af" }
  }
  if (norm.includes("admin")) {
    return { stroke: "#b45309", fill: "#f59e0b", strokeSelected: "#92400e" }
  }
  if (norm.includes("student")) {
    return { stroke: "#047857", fill: "#10b981", strokeSelected: "#065f46" }
  }
  if (norm.includes("health") || norm.includes("facilit")) {
    return { stroke: "#be123c", fill: "#f43f5e", strokeSelected: "#9f1239" }
  }
  return { stroke: "#475569", fill: "#94a3b8", strokeSelected: "#334155" }
}

/**
 * Returns Leaflet path styles for an outline depending on category, hover, and selection states.
 */
export function getOutlineStyle(
  categoryName?: string | null,
  isSelected: boolean = false,
  isHovered: boolean = false
): OutlineStyle {
  const colors = getCategoryColors(categoryName)
  if (isSelected) {
    return {
      color: colors.strokeSelected,
      weight: 3,
      opacity: 1,
      fillColor: colors.fill,
      fillOpacity: 0.55,
    }
  }
  if (isHovered) {
    return {
      color: colors.stroke,
      weight: 2,
      opacity: 0.95,
      fillColor: colors.fill,
      fillOpacity: 0.45,
    }
  }
  return {
    color: colors.stroke,
    weight: 1.5,
    opacity: 0.85,
    fillColor: colors.fill,
    fillOpacity: 0.25,
  }
}

/**
 * Calculates the pole of inaccessibility for a polygon or multipolygon using polylabel.
 * Returns [latitude, longitude] suitable for Leaflet positioning.
 */
export function getOutlineLabelPosition(
  geometry: Polygon | MultiPolygon
): [number, number] {
  let polygonRings: number[][][]

  if (geometry.type === "Polygon") {
    polygonRings = geometry.coordinates as number[][][]
  } else {
    // MultiPolygon: pick polygon with most exterior vertices
    let largest = geometry.coordinates[0] as number[][][]
    let maxLen = largest?.[0]?.length ?? 0
    for (const poly of geometry.coordinates) {
      const len = poly[0]?.length ?? 0
      if (len > maxLen) {
        maxLen = len
        largest = poly as number[][][]
      }
    }
    polygonRings = largest
  }

  const resolveFn =
    typeof (polylabel as unknown as { default: unknown }).default === "function"
      ? (polylabel as unknown as { default: typeof polylabel }).default
      : polylabel

  const pole = resolveFn(polygonRings as [number, number][][], 1.0) // [lng, lat]
  return [pole[1], pole[0]] // [lat, lng] for Leaflet
}

/**
 * Tests whether a point [x, y] is inside a polygon ring [[x, y], ...] using ray casting.
 */
export function isPointInRing(
  point: [number, number],
  ring: number[][]
): boolean {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) {
      inside = !inside
    }
  }
  return inside
}

/**
 * Converts GeoJSON Polygon or MultiPolygon coordinates [lng, lat] into Leaflet [lat, lng] format.
 */
export function geoJsonToLeafletPositions(
  geometry: Polygon | MultiPolygon
): [number, number][][] | [number, number][][][] {
  if (geometry.type === "Polygon") {
    return (geometry.coordinates as number[][][]).map((ring: number[][]) =>
      ring.map(([lng, lat]: number[]) => [lat, lng] as [number, number])
    )
  }
  return (geometry.coordinates as number[][][][]).map((poly: number[][][]) =>
    poly.map((ring: number[][]) =>
      ring.map(([lng, lat]: number[]) => [lat, lng] as [number, number])
    )
  )
}

/**
 * Determines whether a building outline is wide and tall enough on screen
 * for its building code label to fit without overflowing.
 */
export function isOutlineWideEnough(
  pixelWidth: number,
  pixelHeight: number,
  code: string | null | undefined
): boolean {
  if (!code || !code.trim()) return false
  const trimmed = code.trim()
  const requiredWidth = Math.max(trimmed.length * 8 + 14, 36)
  const requiredHeight = 18
  return pixelWidth >= requiredWidth && pixelHeight >= requiredHeight
}
