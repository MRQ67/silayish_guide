import { describe, expect, it } from "vitest"
import { isValidUuid, locationSchema } from "./location"

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

  describe("UUID validation and self-parent constraint", () => {
    const validUuid1 = "123e4567-e89b-12d3-a456-426614174000"
    const validUuid2 = "987fcdeb-51a2-43f7-9876-543210987654"

    it("validates UUIDs correctly with isValidUuid", () => {
      expect(isValidUuid(validUuid1)).toBe(true)
      expect(isValidUuid("not-a-uuid")).toBe(false)
      expect(isValidUuid(null)).toBe(false)
      expect(isValidUuid(undefined)).toBe(false)
    })

    it("rejects non-UUID id", () => {
      const result = locationSchema.safeParse({
        ...baseValidData,
        id: "invalid-id",
      })
      expect(result.success).toBe(false)
    })

    it("rejects non-UUID category_id and parent_id", () => {
      const badCategory = locationSchema.safeParse({
        ...baseValidData,
        category_id: "not-a-uuid",
      })
      expect(badCategory.success).toBe(false)

      const badParent = locationSchema.safeParse({
        ...baseValidData,
        parent_id: "not-a-uuid",
      })
      expect(badParent.success).toBe(false)
    })

    it("fails when a location is its own parent", () => {
      const result = locationSchema.safeParse({
        ...baseValidData,
        id: validUuid1,
        parent_id: validUuid1,
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
        id: validUuid1,
        parent_id: validUuid2,
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

  describe("optional fields handling and form submission", () => {
    const validCategoryId = "11111111-1111-1111-1111-111111111101"
    const validParentId = "22222222-2222-2222-2222-222222222201"

    it("passes when submitted with valid category UUID, code, description, name, type, and empty optional fields", () => {
      const payload = {
        name: "Engineering Complex",
        code: "B-015",
        type: "building",
        category_id: validCategoryId,
        description: "Main engineering research block",
        parent_id: "",
        lat: "",
        lng: "",
        floor: "",
        opening_hours: "",
        photo_url: "",
      }

      const result = locationSchema.safeParse(payload)
      expect(result.success).toBe(true)

      if (result.success) {
        expect(result.data.name).toBe("Engineering Complex")
        expect(result.data.code).toBe("B-015")
        expect(result.data.type).toBe("building")
        expect(result.data.category_id).toBe(validCategoryId)
        expect(result.data.description).toBe("Main engineering research block")
        expect(result.data.parent_id).toBeNull()
        expect(result.data.lat).toBeNull()
        expect(result.data.lng).toBeNull()
        expect(result.data.floor).toBeNull()
        expect(result.data.opening_hours).toBeNull()
        expect(result.data.photo_url).toBeNull()
      }
    })

    it("converts every optional field from empty or whitespace strings into null", () => {
      const payload = {
        name: "Test Location",
        type: "lab",
        code: "   ",
        parent_id: "   ",
        category_id: "   ",
        description: "   ",
        lat: "   ",
        lng: "   ",
        floor: "   ",
        opening_hours: "   ",
        photo_url: "   ",
      }

      const result = locationSchema.safeParse(payload)
      expect(result.success).toBe(true)

      if (result.success) {
        expect(result.data.code).toBeNull()
        expect(result.data.parent_id).toBeNull()
        expect(result.data.category_id).toBeNull()
        expect(result.data.description).toBeNull()
        expect(result.data.lat).toBeNull()
        expect(result.data.lng).toBeNull()
        expect(result.data.floor).toBeNull()
        expect(result.data.opening_hours).toBeNull()
        expect(result.data.photo_url).toBeNull()
      }
    })

    it("accepts valid values for all optional fields", () => {
      const payload = {
        name: "Robotics Lab",
        code: "lab-01",
        type: "lab",
        parent_id: validParentId,
        category_id: validCategoryId,
        description: "Robotics and automation lab",
        lat: "9.5934",
        lng: "41.8596",
        floor: "2",
        opening_hours: "Mon-Fri 8am-5pm",
        photo_url: "https://example.com/robotics.jpg",
      }

      const result = locationSchema.safeParse(payload)
      expect(result.success).toBe(true)

      if (result.success) {
        expect(result.data.code).toBe("LAB-01")
        expect(result.data.parent_id).toBe(validParentId)
        expect(result.data.category_id).toBe(validCategoryId)
        expect(result.data.lat).toBe(9.5934)
        expect(result.data.lng).toBe(41.8596)
        expect(result.data.floor).toBe(2)
        expect(result.data.opening_hours).toBe("Mon-Fri 8am-5pm")
        expect(result.data.photo_url).toBe("https://example.com/robotics.jpg")
      }
    })
  })

  describe("field-level error reporting on invalid values", () => {
    it("reports an error on name when name is empty", () => {
      const result = locationSchema.safeParse({
        name: "   ",
        type: "building",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors
        expect(fieldErrors.name).toBeDefined()
        expect(fieldErrors.name?.[0]).toBe("Name is required")
      }
    })

    it("reports an error on code when code exceeds 20 characters", () => {
      const result = locationSchema.safeParse({
        name: "Main Library",
        type: "building",
        code: "A".repeat(21),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors
        expect(fieldErrors.code).toBeDefined()
        expect(fieldErrors.code?.[0]).toBe(
          "Code must be between 1 and 20 characters"
        )
      }
    })

    it("reports an error on lng when only lat is set", () => {
      const result = locationSchema.safeParse({
        name: "Main Library",
        type: "building",
        lat: 9.5934,
        lng: "",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors
        expect(fieldErrors.lng).toBeDefined()
        expect(fieldErrors.lng?.[0]).toBe(
          "Latitude and longitude must both be set or both be empty"
        )
      }
    })

    it("reports an error on lat when lat is out of range", () => {
      const result = locationSchema.safeParse({
        name: "Main Library",
        type: "building",
        lat: 95,
        lng: 41,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors
        expect(fieldErrors.lat).toBeDefined()
        expect(fieldErrors.lat?.[0]).toBe(
          "Latitude must be between -90 and 90"
        )
      }
    })

    it("reports an error on floor when floor is a non-integer", () => {
      const result = locationSchema.safeParse({
        name: "Main Library",
        type: "building",
        floor: 1.5,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors
        expect(fieldErrors.floor).toBeDefined()
        expect(fieldErrors.floor?.[0]).toBe("Floor must be an integer")
      }
    })

    it("reports an error on category_id when non-empty invalid UUID is provided", () => {
      const result = locationSchema.safeParse({
        name: "Main Library",
        type: "building",
        category_id: "not-a-valid-uuid",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors
        expect(fieldErrors.category_id).toBeDefined()
        expect(fieldErrors.category_id?.[0]).toBe("Invalid category ID")
      }
    })

    it("reports an error on parent_id when non-empty invalid UUID is provided", () => {
      const result = locationSchema.safeParse({
        name: "Main Library",
        type: "building",
        parent_id: "not-a-valid-uuid",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors
        expect(fieldErrors.parent_id).toBeDefined()
        expect(fieldErrors.parent_id?.[0]).toBe("Invalid parent building ID")
      }
    })
  })
})

