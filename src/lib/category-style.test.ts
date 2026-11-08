import { describe, expect, it } from "vitest"
import { resolveCategoryStyle } from "./category-style"

describe("resolveCategoryStyle", () => {
  it("prefers the persisted category color", () => {
    expect(
      resolveCategoryStyle({ id: "x", name: "Academics", color: "#123456" })
        .color
    ).toBe("#123456")
  })
  it("preserves legacy colors for categories without a stored value", () => {
    expect(
      resolveCategoryStyle({ id: "x", name: "Academics", color: null }).color
    ).toBe("#2563eb")
  })
  it("uses a safe neutral fallback for unknown categories", () => {
    expect(
      resolveCategoryStyle({ id: "x", name: "Unmapped", color: null }).color
    ).toBe("#64748b")
  })
  it("derives polygon and badge colors from the same base color", () => {
    const style = resolveCategoryStyle({
      id: "x",
      name: "Custom",
      color: "#ABCDEF",
    })
    expect(style.fill).toBe(style.color)
    expect(style.badgeBackground).toBe("#f5f9fd")
  })
})
