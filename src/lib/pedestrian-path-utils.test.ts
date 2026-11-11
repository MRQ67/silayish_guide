import { describe, expect, it } from "vitest"
import type { PedestrianPath } from "@/lib/types"
import {
  getActivePedestrianPaths,
  lineStringToLeafletPositions,
} from "./pedestrian-path-utils"

const makePath = (id: string, is_active: boolean): PedestrianPath => ({
  id,
  name: `Path ${id}`,
  geometry: { type: "LineString", coordinates: [[41.8, 9.6], [41.9, 9.7]] },
  path_type: "walkway",
  wheelchair_accessible: true,
  surface: null,
  notes: null,
  is_active,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
})

describe("pedestrian path map utilities", () => {
  it("exposes active paths to the student map and filters inactive paths", () => {
    const active = makePath("active", true)
    const inactive = makePath("inactive", false)
    expect(getActivePedestrianPaths([active, inactive])).toEqual([active])
  })

  it("converts GeoJSON [longitude, latitude] to Leaflet [latitude, longitude]", () => {
    expect(lineStringToLeafletPositions([[41.8, 9.6], [41.9, 9.7]])).toEqual([
      [9.6, 41.8],
      [9.7, 41.9],
    ])
  })
})
