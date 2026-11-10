import { describe, expect, it } from "vitest"
import { entranceListSchema, entranceSchema } from "./entrance"

const validEntrance = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Main gate",
  lat: 9.6178,
  lng: 41.8362,
}

describe("entrance validation", () => {
  it("trims the name and converts empty accessibility notes to null", () => {
    const result = entranceSchema.safeParse({
      ...validEntrance,
      name: " Main gate ",
      accessibility: " ",
    })
    expect(result.success).toBe(true)
    if (result.success)
      expect(result.data).toMatchObject({
        name: "Main gate",
        accessibility: null,
      })
  })
  it("rejects missing names and out-of-range coordinates", () => {
    expect(
      entranceSchema.safeParse({ ...validEntrance, name: " " }).success
    ).toBe(false)
    expect(
      entranceSchema.safeParse({ ...validEntrance, lat: 91 }).success
    ).toBe(false)
    expect(
      entranceSchema.safeParse({ ...validEntrance, lng: -181 }).success
    ).toBe(false)
  })
  it("rejects duplicate ids and more than 100 entrances", () => {
    expect(
      entranceListSchema.safeParse([validEntrance, validEntrance]).success
    ).toBe(false)
    expect(
      entranceListSchema.safeParse(
        Array.from({ length: 101 }, (_, index) => ({
          ...validEntrance,
          id: `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`,
        }))
      ).success
    ).toBe(false)
  })
})
