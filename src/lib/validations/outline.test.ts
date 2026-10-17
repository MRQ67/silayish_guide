import { describe, expect, it } from "vitest"
import type { Feature, FeatureCollection, Polygon } from "@/lib/types"
import {
  extractGeoJsonGeometry,
  haversineDistanceMeters,
  validateOutline,
  validateOutlineGeometry,
} from "./outline"

describe("extractGeoJsonGeometry", () => {
  const validPolygon: Polygon = {
    type: "Polygon",
    coordinates: [
      [
        [41.835, 9.617],
        [41.837, 9.617],
        [41.837, 9.619],
        [41.835, 9.619],
        [41.835, 9.617],
      ],
    ],
  }

  it("extracts bare Polygon geometry", () => {
    const result = extractGeoJsonGeometry(validPolygon)
    expect(result.geometry).toEqual(validPolygon)
    expect(result.error).toBeUndefined()
  })

  it("extracts Polygon from a GeoJSON Feature", () => {
    const feature: Feature = {
      type: "Feature",
      geometry: validPolygon,
      properties: { name: "Test Hall" },
    }
    const result = extractGeoJsonGeometry(feature)
    expect(result.geometry).toEqual(validPolygon)
  })

  it("extracts Polygon from a single-feature FeatureCollection", () => {
    const fc: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: validPolygon,
          properties: {},
        },
      ],
    }
    const result = extractGeoJsonGeometry(fc)
    expect(result.geometry).toEqual(validPolygon)
  })

  it("extracts geometry from a JSON string", () => {
    const jsonStr = JSON.stringify(validPolygon)
    const result = extractGeoJsonGeometry(jsonStr)
    expect(result.geometry).toEqual(validPolygon)
  })

  it("rejects invalid JSON string", () => {
    const result = extractGeoJsonGeometry("{ not json }")
    expect(result.error).toBe("Invalid JSON format")
  })

  it("rejects FeatureCollection with multiple features", () => {
    const fc: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", geometry: validPolygon, properties: {} },
        { type: "Feature", geometry: validPolygon, properties: {} },
      ],
    }
    const result = extractGeoJsonGeometry(fc)
    expect(result.error).toContain("exactly one feature")
  })

  it("rejects non-polygon GeoJSON type like Point", () => {
    const point = { type: "Point", coordinates: [41.835, 9.617] }
    const result = extractGeoJsonGeometry(point)
    expect(result.error).toContain("Polygon, MultiPolygon")
  })
})

describe("validateOutlineGeometry", () => {
  it("passes for valid closed Polygon with at least 4 coordinates", () => {
    const polygon: Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [41.835, 9.617],
          [41.837, 9.617],
          [41.837, 9.619],
          [41.835, 9.619],
          [41.835, 9.617],
        ],
      ],
    }
    const result = validateOutlineGeometry(polygon)
    expect(result.valid).toBe(true)
  })

  it("rejects an unclosed polygon ring", () => {
    const unclosed: Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [41.835, 9.617],
          [41.837, 9.617],
          [41.837, 9.619],
          [41.835, 9.619],
        ],
      ],
    }
    const result = validateOutlineGeometry(unclosed)
    expect(result.valid).toBe(false)
    expect(result.error).toContain("Ring is not closed")
  })

  it("rejects a ring with fewer than 4 positions", () => {
    const tooFew: Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [41.835, 9.617],
          [41.837, 9.617],
          [41.835, 9.617],
        ],
      ],
    }
    const result = validateOutlineGeometry(tooFew)
    expect(result.valid).toBe(false)
    expect(result.error).toContain("at least 4 positions")
  })

  it("rejects coordinates with latitude out of range", () => {
    const invalidLat: Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [41.835, 95.0],
          [41.837, 95.0],
          [41.837, 95.1],
          [41.835, 95.1],
          [41.835, 95.0],
        ],
      ],
    }
    const result = validateOutlineGeometry(invalidLat)
    expect(result.valid).toBe(false)
    expect(result.error).toContain("Latitude 95 is out of range")
  })

  it("rejects coordinates with longitude out of range", () => {
    const invalidLng: Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [190.0, 9.617],
          [190.1, 9.617],
          [190.1, 9.619],
          [190.0, 9.619],
          [190.0, 9.617],
        ],
      ],
    }
    const result = validateOutlineGeometry(invalidLng)
    expect(result.valid).toBe(false)
    expect(result.error).toContain("Longitude 190 is out of range")
  })
})

describe("validateOutline distance check against location coordinates", () => {
  const campusPolygon: Polygon = {
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

  it("passes when outline is within 1 km of location coordinates", () => {
    const location = { lat: 9.6175, lng: 41.8365 }
    const result = validateOutline(campusPolygon, location)
    expect(result.valid).toBe(true)
    expect(result.geometry).toBeDefined()
  })

  it("rejects when outline center is farther than 1 km from location coordinates", () => {
    // Addis Ababa coordinate is > 400km away
    const farLocation = { lat: 9.03, lng: 38.74 }
    const result = validateOutline(campusPolygon, farLocation)
    expect(result.valid).toBe(false)
    expect(result.error).toContain("coordinates may be swapped")
  })

  it("allows empty input to be valid (becomes null/undefined)", () => {
    expect(validateOutline("").valid).toBe(true)
    expect(validateOutline("   ").valid).toBe(true)
    expect(validateOutline(null).valid).toBe(true)
    expect(validateOutline(undefined).valid).toBe(true)
  })

  it("calculates haversine distance accurately", () => {
    // 1 degree latitude is approximately 111,000 meters
    const dist = haversineDistanceMeters(9.0, 41.0, 10.0, 41.0)
    expect(dist).toBeGreaterThan(110000)
    expect(dist).toBeLessThan(112000)
  })
})
