import { describe, expect, it } from "vitest"
import type { Polygon } from "./types"
import {
  geoJsonToLeafletPositions,
  getCategoryColors,
  getOutlineLabelPosition,
  getOutlineStyle,
  isOutlineWideEnough,
  isPointInRing,
} from "./outline-utils"

describe("label placement helper with concave shape", () => {
  // C-shaped concave polygon in [lng, lat] coordinates:
  // (0,0) -> (3,0) -> (3,1) -> (1,1) -> (1,2) -> (3,2) -> (3,3) -> (0,3) -> (0,0)
  const cShapeRing: [number, number][] = [
    [0, 0],
    [3, 0],
    [3, 1],
    [1, 1],
    [1, 2],
    [3, 2],
    [3, 3],
    [0, 3],
    [0, 0],
  ]

  const concavePolygon: Polygon = {
    type: "Polygon",
    coordinates: [cShapeRing],
  }

  it("verifies the bounding box midpoint of C-shape falls in the hollow exterior", () => {
    // Bounding box center is at [1.5, 1.5], which is outside the C-shape
    const bboxMidpoint: [number, number] = [1.5, 1.5]
    expect(isPointInRing(bboxMidpoint, cShapeRing)).toBe(false)
  })

  it("returns a pole of inaccessibility that is strictly inside the concave shape", () => {
    // getOutlineLabelPosition returns [lat, lng]
    const [labelLat, labelLng] = getOutlineLabelPosition(concavePolygon)

    // Verify coordinates are numbers
    expect(typeof labelLat).toBe("number")
    expect(typeof labelLng).toBe("number")

    // Verify the point is inside the ring
    const pointInside = isPointInRing([labelLng, labelLat], cShapeRing)
    expect(pointInside).toBe(true)
  })
})

describe("category color mapping", () => {
  it("maps academic category to blue tones", () => {
    const colors = getCategoryColors("Academics")
    expect(colors.stroke).toBe("#1d4ed8")
    expect(colors.fill).toBe("#3b82f6")
  })

  it("maps administration category to amber tones", () => {
    const colors = getCategoryColors("Administration Building")
    expect(colors.stroke).toBe("#b45309")
    expect(colors.fill).toBe("#f59e0b")
  })

  it("maps student life category to green tones", () => {
    const colors = getCategoryColors("Student Life")
    expect(colors.stroke).toBe("#047857")
    expect(colors.fill).toBe("#10b981")
  })

  it("maps healthcare / facilities category to red/rose tones", () => {
    const colors = getCategoryColors("Healthcare & Facilities")
    expect(colors.stroke).toBe("#be123c")
    expect(colors.fill).toBe("#f43f5e")
  })

  it("falls back to slate gray for unknown or empty categories", () => {
    const emptyColors = getCategoryColors(null)
    expect(emptyColors.stroke).toBe("#475569")
    expect(emptyColors.fill).toBe("#94a3b8")

    const unknownColors = getCategoryColors("Other Category")
    expect(unknownColors.stroke).toBe("#475569")
    expect(unknownColors.fill).toBe("#94a3b8")
  })

  it("adjusts fillOpacity and border weights on hover and selected states", () => {
    const normal = getOutlineStyle("Academics", false, false)
    expect(normal.fillOpacity).toBe(0.25)
    expect(normal.weight).toBe(1.5)

    const hovered = getOutlineStyle("Academics", false, true)
    expect(hovered.fillOpacity).toBe(0.45)
    expect(hovered.weight).toBe(2)

    const selected = getOutlineStyle("Academics", true, false)
    expect(selected.fillOpacity).toBe(0.55)
    expect(selected.weight).toBe(3)
  })
})

describe("geoJsonToLeafletPositions", () => {
  it("converts Polygon coordinates from [lng, lat] to Leaflet [lat, lng]", () => {
    const polygon: Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [41.836, 9.617],
          [41.837, 9.617],
          [41.837, 9.618],
          [41.836, 9.618],
          [41.836, 9.617],
        ],
      ],
    }

    const leafletPositions = geoJsonToLeafletPositions(polygon) as [number, number][][]
    expect(leafletPositions).toEqual([
      [
        [9.617, 41.836],
        [9.617, 41.837],
        [9.618, 41.837],
        [9.618, 41.836],
        [9.617, 41.836],
      ],
    ])
  })
})

describe("isOutlineWideEnough", () => {
  it("returns true when bounding box has sufficient width and height for code", () => {
    expect(isOutlineWideEnough(60, 25, "B-002")).toBe(true)
    expect(isOutlineWideEnough(100, 50, "HALL-A")).toBe(true)
  })

  it("returns false when bounding box is too narrow or too short", () => {
    // Required width for "B-002" is 5 * 8 + 14 = 54
    expect(isOutlineWideEnough(40, 30, "B-002")).toBe(false)
    expect(isOutlineWideEnough(70, 15, "B-002")).toBe(false)
  })

  it("returns false when code is missing or empty", () => {
    expect(isOutlineWideEnough(100, 100, null)).toBe(false)
    expect(isOutlineWideEnough(100, 100, undefined)).toBe(false)
    expect(isOutlineWideEnough(100, 100, "   ")).toBe(false)
  })
})
