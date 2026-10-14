import { describe, expect, it } from "vitest"
import { normalizeCode, searchLocations } from "./search"
import type { Location } from "./types"

describe("normalizeCode", () => {
  it("normalizes code by converting to lowercase and stripping whitespace and dashes", () => {
    expect(normalizeCode("B-002")).toBe("b002")
    expect(normalizeCode("b002")).toBe("b002")
    expect(normalizeCode("B 002")).toBe("b002")
    expect(normalizeCode("b-002")).toBe("b002")
    expect(normalizeCode(" B - 002 ")).toBe("b002")
  })

  it("handles null, undefined, and empty string gracefully", () => {
    expect(normalizeCode(null)).toBe("")
    expect(normalizeCode(undefined)).toBe("")
    expect(normalizeCode("")).toBe("")
  })
})

describe("searchLocations", () => {
  const sampleLocations: Location[] = [
    {
      id: "loc-1",
      name: "Main Administration Building",
      code: "B-001",
      type: "building",
      description: "Central campus offices and registrar",
    },
    {
      id: "loc-2",
      name: "Science and Technology Complex",
      code: "B-002",
      type: "building",
      description: "Laboratories and lecture halls",
    },
    {
      id: "loc-3",
      name: "Engineering Workshop",
      code: "B-002-W",
      type: "facility",
      description: "Heavy machinery and fabrication lab",
    },
    {
      id: "loc-4",
      name: "Campus Green Park",
      code: null,
      type: "facility",
      description: "Open recreational area without building code",
    },
    {
      id: "loc-5",
      name: "B-002 Reference Office",
      code: "ADM-10",
      type: "office",
      description: "Administrative service desk mentioning B-002 in name",
    },
  ]

  it("finds location B-002 using 'b002'", () => {
    const results = searchLocations(sampleLocations, "b002")
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].id).toBe("loc-2")
    expect(results[0].code).toBe("B-002")
  })

  it("finds location B-002 using 'B 002'", () => {
    const results = searchLocations(sampleLocations, "B 002")
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].id).toBe("loc-2")
    expect(results[0].code).toBe("B-002")
  })

  it("finds location B-002 using 'b-002'", () => {
    const results = searchLocations(sampleLocations, "b-002")
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].id).toBe("loc-2")
    expect(results[0].code).toBe("B-002")
  })

  it("finds matching locations with partial code 'B-00'", () => {
    const results = searchLocations(sampleLocations, "B-00")
    const ids = results.map((r) => r.id)
    expect(ids).toContain("loc-1")
    expect(ids).toContain("loc-2")
    expect(ids).toContain("loc-3")
  })

  it("returns empty array when query does not match any location", () => {
    const results = searchLocations(sampleLocations, "XYZ-999")
    expect(results).toEqual([])
  })

  it("returns empty array for empty query or whitespace", () => {
    expect(searchLocations(sampleLocations, "")).toEqual([])
    expect(searchLocations(sampleLocations, "   ")).toEqual([])
  })

  it("correctly handles locations whose code is null", () => {
    const results = searchLocations(sampleLocations, "Green Park")
    expect(results.length).toBe(1)
    expect(results[0].id).toBe("loc-4")
    expect(results[0].code).toBeNull()
  })

  it("ranks exact code matches first over name or description matches", () => {
    const results = searchLocations(sampleLocations, "B-002")
    expect(results.length).toBeGreaterThanOrEqual(2)
    // loc-2 has exact code "B-002", loc-5 has "B-002" only in its name
    expect(results[0].id).toBe("loc-2")
    expect(results[0].code).toBe("B-002")
  })
})
