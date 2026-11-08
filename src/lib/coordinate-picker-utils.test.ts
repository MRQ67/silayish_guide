import { describe, expect, it } from "vitest"
import { fromCoordinatePair, toCoordinatePair } from "./coordinate-picker-utils"

describe("coordinate picker synchronization", () => {
  it("uses map coordinates as form field values", () => {
    const fields = fromCoordinatePair([9.6178, 41.8362])
    expect(fields).toEqual({ lat: "9.6178", lng: "41.8362" })
    expect(toCoordinatePair(fields.lat, fields.lng)).toEqual([9.6178, 41.8362])
  })
  it("does not place a marker until both manually entered coordinates are valid", () => {
    expect(toCoordinatePair("9.6", "")).toBeNull()
    expect(toCoordinatePair("bad", "41.8")).toBeNull()
    expect(toCoordinatePair("91", "41.8")).toBeNull()
  })
})
