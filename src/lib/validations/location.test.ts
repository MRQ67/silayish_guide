import { describe, expect, it } from "vitest"
import { locationSchema } from "./location"

describe("locationSchema", () => {
  const baseValidData = {
    name: "Main Building",
    type: "building" as const,
  }

  describe("code normalization and handling", () => {
    it("trims and uppercases valid code", () => {
      const result = locationSchema.safeParse({
        ...baseValidData,
        code: "  b-002  ",
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.code).toBe("B-002")
      }
    })

    it("converts lowercase code to uppercase", () => {
      const result = locationSchema.safeParse({
        ...baseValidData,
        code: "lab-4b",
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.code).toBe("LAB-4B")
      }
    })

    it("stores empty code as null", () => {
      const emptyStringResult = locationSchema.safeParse({
        ...baseValidData,
        code: "",
      })
      expect(emptyStringResult.success).toBe(true)
      if (emptyStringResult.success) {
        expect(emptyStringResult.data.code).toBeNull()
      }

      const whitespaceResult = locationSchema.safeParse({
        ...baseValidData,
        code: "    ",
      })
      expect(whitespaceResult.success).toBe(true)
      if (whitespaceResult.success) {
        expect(whitespaceResult.data.code).toBeNull()
      }

      const nullResult = locationSchema.safeParse({
        ...baseValidData,
        code: null,
      })
      expect(nullResult.success).toBe(true)
      if (nullResult.success) {
        expect(nullResult.data.code).toBeNull()
      }

      const undefinedResult = locationSchema.safeParse({
        ...baseValidData,
      })
      expect(undefinedResult.success).toBe(true)
      if (undefinedResult.success) {
        expect(undefinedResult.data.code).toBeNull()
      }
    })

    it("rejects code longer than 20 characters", () => {
      const result = locationSchema.safeParse({
        ...baseValidData,
        code: "A".repeat(21),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("20 characters")
      }
    })
  })

  describe("coordinate pairing and ranges", () => {
    it("allows both lat and lng to be empty or null", () => {
      const result = locationSchema.safeParse({
        ...baseValidData,
        lat: null,
        lng: null,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.lat).toBeNull()
        expect(result.data.lng).toBeNull()
      }
    })

    it("allows valid lat and lng numbers", () => {
      const result = locationSchema.safeParse({
        ...baseValidData,
        lat: 9.5934,
        lng: 41.8596,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.lat).toBe(9.5934)
        expect(result.data.lng).toBe(41.8596)
      }
    })

    it("parses string coordinates from form inputs", () => {
      const result = locationSchema.safeParse({
        ...baseValidData,
        lat: " 9.5934 ",
        lng: " 41.8596 ",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.lat).toBe(9.5934)
        expect(result.data.lng).toBe(41.8596)
      }
    })

    it("fails when lat is provided without lng", () => {
      const result = locationSchema.safeParse({
        ...baseValidData,
        lat: 9.5934,
        lng: null,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Latitude and longitude must both be set or both be empty"
        )
      }
    })

    it("fails when lng is provided without lat", () => {
      const result = locationSchema.safeParse({
        ...baseValidData,
        lat: null,
        lng: 41.8596,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Latitude and longitude must both be set or both be empty"
        )
      }
    })

    it("fails when lat is outside [-90, 90]", () => {
      const tooHigh = locationSchema.safeParse({
        ...baseValidData,
        lat: 90.1,
        lng: 40,
      })
      expect(tooHigh.success).toBe(false)

      const tooLow = locationSchema.safeParse({
        ...baseValidData,
        lat: -91,
        lng: 40,
      })
      expect(tooLow.success).toBe(false)
    })

    it("fails when lng is outside [-180, 180]", () => {
      const tooHigh = locationSchema.safeParse({
        ...baseValidData,
        lat: 10,
        lng: 180.5,
      })
      expect(tooHigh.success).toBe(false)

      const tooLow = locationSchema.safeParse({
        ...baseValidData,
        lat: 10,
        lng: -181,
      })
      expect(tooLow.success).toBe(false)
    })
  })

  describe("self-parent constraint", () => {
    it("fails when a location is its own parent", () => {
      const result = locationSchema.safeParse({
        ...baseValidData,
        id: "location-abc",
        parent_id: "location-abc",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "A location cannot be its own parent"
        )
      }
    })

    it("succeeds when parent is a different location", () => {
      const result = locationSchema.safeParse({
        ...baseValidData,
        id: "location-abc",
        parent_id: "location-xyz",
      })

      expect(result.success).toBe(true)
    })
  })

  describe("name and floor validation", () => {
    it("fails when name is empty or only whitespace", () => {
      const result = locationSchema.safeParse({
        ...baseValidData,
        name: "   ",
      })
      expect(result.success).toBe(false)
    })

    it("trims the name", () => {
      const result = locationSchema.safeParse({
        ...baseValidData,
        name: "  Science Hall  ",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe("Science Hall")
      }
    })

    it("allows integer floor and rejects non-integer floor", () => {
      const validFloor = locationSchema.safeParse({
        ...baseValidData,
        floor: 3,
      })
      expect(validFloor.success).toBe(true)

      const invalidFloor = locationSchema.safeParse({
        ...baseValidData,
        floor: 3.5,
      })
      expect(invalidFloor.success).toBe(false)
    })
  })
})
