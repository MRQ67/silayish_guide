import type { MultiPolygon, Polygon, Position } from "./types"

export type PolygonPart = Position[][]
export type PolygonParts = PolygonPart[]
export type BuildingGeometry = Polygon | MultiPolygon

export function getPolygonParts(
  geometry: BuildingGeometry | null
): PolygonParts {
  if (!geometry) return []
  return geometry.type === "Polygon"
    ? [geometry.coordinates]
    : geometry.coordinates
}

export function fromPolygonParts(parts: PolygonParts): BuildingGeometry | null {
  if (parts.length === 0) return null
  if (parts.length === 1) return { type: "Polygon", coordinates: parts[0] }
  return { type: "MultiPolygon", coordinates: parts }
}

export function closePolygonRing(points: Position[]): Position[] | null {
  if (points.length < 3) return null
  const ring = points.map(([lng, lat]) => [lng, lat])
  const [firstLng, firstLat] = ring[0]
  const [lastLng, lastLat] = ring[ring.length - 1]
  if (firstLng !== lastLng || firstLat !== lastLat) {
    ring.push([firstLng, firstLat])
  }
  return ring
}

export function appendPolygonPart(
  geometry: BuildingGeometry | null,
  ring: Position[]
): BuildingGeometry | null {
  const closed = closePolygonRing(ring)
  if (!closed) return geometry
  return fromPolygonParts([...getPolygonParts(geometry), [closed]])
}

export function removePolygonPart(
  geometry: BuildingGeometry,
  polygonIndex: number
): BuildingGeometry | null {
  return fromPolygonParts(
    getPolygonParts(geometry).filter((_, index) => index !== polygonIndex)
  )
}

export function movePolygonVertex(
  geometry: BuildingGeometry,
  polygonIndex: number,
  ringIndex: number,
  vertexIndex: number,
  position: Position
): BuildingGeometry {
  const parts = getPolygonParts(geometry).map((polygon) =>
    polygon.map((ring) => ring.map(([lng, lat]) => [lng, lat]))
  )
  const ring = parts[polygonIndex]?.[ringIndex]
  if (!ring || vertexIndex < 0 || vertexIndex >= ring.length - 1) {
    return geometry
  }
  ring[vertexIndex] = [position[0], position[1]]
  if (vertexIndex === 0) {
    ring[ring.length - 1] = [position[0], position[1]]
  }
  return fromPolygonParts(parts) ?? geometry
}
