import { describe, expect, it } from "vitest"
import {
  lineStringSchema,
  pedestrianPathSchema,
} from "./pedestrian-path"

const validPath = {
  name: "Main walkway",
  geometry: {
    type: "LineString",
    coordinates: [
      [41.836, 9.617],
      [41.837, 9.618],
    ],
  },
  path_type: "walkway",
  wheelchair_accessible: true,
  is_active: true,
}

describe("pedestrian path validation", () => {
  it("accepts valid LineStrings and normalizes empty optional fields", () => {
    const result = pedestrianPathSchema.safeParse({
      ...validPath,
      surface: "  ",
      notes: "  ",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.surface).toBeNull()
      expect(result.data.notes).toBeNull()
    }
  })

  it("rejects malformed, out-of-range, non-finite, or repeated-only coordinates", () => {
    expect(
      lineStringSchema.safeParse({ type: "LineString", coordinates: [[1, 2]] })
        .success
    ).toBe(false)
    expect(
      lineStringSchema.safeParse({
        type: "LineString",
        coordinates: [[181, 2], [2, 3]],
      }).success
    ).toBe(false)
    expect(
      lineStringSchema.safeParse({
        type: "LineString",
        coordinates: [[1, 2], [Number.NaN, 3]],
      }).success
    ).toBe(false)
    expect(
      lineStringSchema.safeParse({
        type: "LineString",
        coordinates: [[1, 2], [1, 2]],
      }).success
    ).toBe(false)
  })

  it("rejects paths with too many points or invalid metadata", () => {
    const tooManyPoints = Array.from({ length: 501 }, (_, index) => [index, 1])
    expect(
      pedestrianPathSchema.safeParse({
        ...validPath,
        geometry: { type: "LineString", coordinates: tooManyPoints },
      }).success
    ).toBe(false)
    expect(
      pedestrianPathSchema.safeParse({ ...validPath, path_type: "stairs-ish" })
        .success
    ).toBe(false)
    expect(
      pedestrianPathSchema.safeParse({ ...validPath, wheelchair_accessible: "yes" })
        .success
    ).toBe(false)
  })
})
