import { describe, expect, it } from "vitest"
import { cn } from "./utils"

describe("cn utility", () => {
  it("merges class names correctly", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1")
  })

  it("handles conditional class names", () => {
    const isHidden = false
    const isActive = true
    expect(cn("base-class", isHidden && "hidden", isActive && "active")).toBe(
      "base-class active"
    )
  })

  it("handles overlapping Tailwind classes", () => {
    expect(cn("p-4", "p-2")).toBe("p-2")
  })
})
