import { describe, expect, it } from "vitest"
import type { Polygon, Position } from "./types"
import {
  appendPolygonPart,
  closePolygonRing,
  fromPolygonParts,
  getPolygonParts,
  movePolygonVertex,
  removePolygonPart,
} from "./building-map-utils"

const ring: Position[] = [
  [41.835, 9.617],
  [41.837, 9.617],
  [41.837, 9.619],
]
const polygon: Polygon = {
  type: "Polygon",
  coordinates: [[...ring, ring[0]]],
}

describe("building map geometry operations", () => {
  it("closes a drawn ring and rejects fewer than three vertices", () => {
    expect(closePolygonRing(ring)?.at(-1)).toEqual(ring[0])
    expect(closePolygonRing(ring.slice(0, 2))).toBeNull()
  })

  it("converts a polygon to multipolygon when another area is added", () => {
    const next = appendPolygonPart(polygon, [
      [41.838, 9.617],
      [41.839, 9.617],
      [41.839, 9.618],
    ])
    expect(next?.type).toBe("MultiPolygon")
    expect(getPolygonParts(next).length).toBe(2)
  })

  it("moves a vertex and keeps the ring closure synchronized", () => {
    const moved = movePolygonVertex(polygon, 0, 0, 0, [41.836, 9.618])
    expect(moved.coordinates[0][0]).toEqual([41.836, 9.618])
    expect(moved.coordinates[0].at(-1)).toEqual([41.836, 9.618])
  })

  it("removes one multipart area and reduces a single area to Polygon", () => {
    const multipart = fromPolygonParts([
      [polygon.coordinates[0]],
      [polygon.coordinates[0]],
    ])!
    const onePart = removePolygonPart(multipart, 0)
    expect(onePart?.type).toBe("Polygon")
    expect(removePolygonPart(polygon, 0)).toBeNull()
  })
})
