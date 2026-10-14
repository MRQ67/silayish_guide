import { describe, expect, it } from "vitest"
import {
  calculateMapBounds,
  calculateMapCenter,
  DDU_CAMPUS_CENTER,
  getMapMarkers,
  isValidCoordinate,
} from "./map-utils"
import type { Location } from "./types"

describe("map-utils", () => {
  const validBuilding: Location = {
    id: "loc-1",
    name: "Admin Block",
    code: "B-001",
    type: "building",
    lat: 9.6178,
    lng: 41.8362,
  }

  const validLibrary: Location = {
    id: "loc-2",
    name: "Campus Library",
    code: "B-002",
    type: "facility",
    lat: 9.6185,
    lng: 41.8358,
  }

  const noCoordsLocation: Location = {
    id: "loc-3",
    name: "Virtual Help Desk",
    code: null,
    type: "office",
    lat: null,
    lng: null,
  }

  const partialCoordsLocation: Location = {
    id: "loc-4",
    name: "Partial Point",
    code: "P-01",
    type: "facility",
    lat: 9.619,
    lng: null,
  }

  const invalidCoordsLocation: Location = {
    id: "loc-5",
    name: "Out of Bounds Point",
    code: "OOB",
    type: "facility",
    lat: 100.0,
    lng: 41.83,
  }

  describe("isValidCoordinate", () => {
    it("returns true for valid coordinates", () => {
      expect(isValidCoordinate(9.6178, 41.8362)).toBe(true)
      expect(isValidCoordinate(0, 0)).toBe(true)
      expect(isValidCoordinate(-90, -180)).toBe(true)
      expect(isValidCoordinate(90, 180)).toBe(true)
    })

    it("returns false for null or undefined", () => {
      expect(isValidCoordinate(null, 41.8362)).toBe(false)
      expect(isValidCoordinate(9.6178, null)).toBe(false)
      expect(isValidCoordinate(undefined, 41.8362)).toBe(false)
      expect(isValidCoordinate(9.6178, undefined)).toBe(false)
      expect(isValidCoordinate(null, null)).toBe(false)
    })

    it("returns false for NaN and out-of-range coordinates", () => {
      expect(isValidCoordinate(Number.NaN, 41.8362)).toBe(false)
      expect(isValidCoordinate(9.6178, Number.NaN)).toBe(false)
      expect(isValidCoordinate(91, 41.8362)).toBe(false)
      expect(isValidCoordinate(-91, 41.8362)).toBe(false)
      expect(isValidCoordinate(9.6178, 181)).toBe(false)
      expect(isValidCoordinate(9.6178, -181)).toBe(false)
    })
  })

  describe("getMapMarkers", () => {
    it("maps only locations with valid coordinates into map markers", () => {
      const locations = [
        validBuilding,
        validLibrary,
        noCoordsLocation,
        partialCoordsLocation,
        invalidCoordsLocation,
      ]

      const markers = getMapMarkers(locations)
      expect(markers).toHaveLength(2)
      expect(markers[0]).toEqual({
        id: "loc-1",
        position: [9.6178, 41.8362],
        location: validBuilding,
      })
      expect(markers[1]).toEqual({
        id: "loc-2",
        position: [9.6185, 41.8358],
        location: validLibrary,
      })
    })

    it("returns empty array when no locations have valid coordinates", () => {
      expect(getMapMarkers([noCoordsLocation, partialCoordsLocation])).toEqual(
        []
      )
      expect(getMapMarkers([])).toEqual([])
    })
  })

  describe("calculateMapBounds", () => {
    it("computes correct bounding box for multiple markers", () => {
      const bounds = calculateMapBounds([validBuilding, validLibrary])
      expect(bounds).toEqual([
        [9.6178, 41.8358],
        [9.6185, 41.8362],
      ])
    })

    it("returns bounding box with identical corners for a single marker", () => {
      const bounds = calculateMapBounds([validBuilding])
      expect(bounds).toEqual([
        [9.6178, 41.8362],
        [9.6178, 41.8362],
      ])
    })

    it("returns null when no markers exist", () => {
      expect(calculateMapBounds([])).toBeNull()
      expect(calculateMapBounds([noCoordsLocation])).toBeNull()
    })
  })

  describe("calculateMapCenter", () => {
    it("computes centroid for valid locations", () => {
      const center = calculateMapCenter([validBuilding, validLibrary])
      expect(center[0]).toBeCloseTo((9.6178 + 9.6185) / 2)
      expect(center[1]).toBeCloseTo((41.8362 + 41.8358) / 2)
    })

    it("returns default DDU campus center when no locations have valid coordinates", () => {
      expect(calculateMapCenter([])).toEqual(DDU_CAMPUS_CENTER)
      expect(calculateMapCenter([noCoordsLocation])).toEqual(DDU_CAMPUS_CENTER)
    })
  })
})
