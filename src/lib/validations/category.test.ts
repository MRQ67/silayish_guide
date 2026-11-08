import { describe, expect, it } from "vitest"
import { categorySchema } from "./category"

describe("categorySchema", () => {
  it("accepts and normalizes a valid hexadecimal color", () => {
    const result = categorySchema.safeParse({
      name: "Science",
      icon: "graduation-cap",
      color: "#aBcD12",
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.color).toBe("#aBcD12")
  })
  it.each(["red", "#123", "#12345678", "123456"])(
    "rejects invalid color %s",
    (color) => {
      expect(categorySchema.safeParse({ name: "Science", color }).success).toBe(
        false
      )
    }
  )
  it("allows a missing color for compatibility", () => {
    expect(categorySchema.safeParse({ name: "Legacy" }).success).toBe(true)
  })
})
