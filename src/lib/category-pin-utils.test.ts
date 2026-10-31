// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import {
  createCategoryPinIcon,
  getCategoryBadgeClasses,
  getCategoryPinConfig,
} from "./category-pin-utils"

describe("category-pin-utils", () => {
  it("resolves blue graduation cap for Academics", () => {
    const config = getCategoryPinConfig("Academics")
    expect(config.color).toBe("#2563eb")
    expect(config.iconSvg).toContain("svg")
  })

  it("resolves emerald landmark for Administration", () => {
    const config = getCategoryPinConfig("Administration")
    expect(config.color).toBe("#059669")
  })

  it("resolves rose heart-pulse for Healthcare", () => {
    const config = getCategoryPinConfig("Healthcare & Facilities")
    expect(config.color).toBe("#f43f5e")
  })

  it("resolves purple for Dormitory / Student Life", () => {
    const config = getCategoryPinConfig("Student Life")
    expect(config.color).toBe("#9333ea")
  })

  it("falls back to default slate pin for unknown/null category", () => {
    const configNull = getCategoryPinConfig(null)
    expect(configNull.color).toBe("#64748b")

    const configUnknown = getCategoryPinConfig("Random Custom")
    expect(configUnknown.color).toBe("#64748b")
  })

  it("creates Leaflet divIcon with expected dimensions and HTML", () => {
    const defaultPin = createCategoryPinIcon("Academics", false)
    expect(defaultPin.options.className).toContain("category-marker-pin")
    expect(defaultPin.options.iconSize).toEqual([30, 38])

    const selectedPin = createCategoryPinIcon("Academics", true)
    expect(selectedPin.options.iconSize).toEqual([36, 44])
  })

  it("caches divIcon instances to prevent unnecessary Leaflet DOM recreation", () => {
    const first = createCategoryPinIcon("Academics", false)
    const second = createCategoryPinIcon("Academics", false)
    expect(first).toBe(second)
  })

  it("provides tailored squircle badge color classes for categories", () => {
    const acad = getCategoryBadgeClasses("Academics")
    expect(acad.bg).toContain("blue")
    expect(acad.text).toContain("blue")

    const admin = getCategoryBadgeClasses("Administration")
    expect(admin.bg).toContain("emerald")

    const health = getCategoryBadgeClasses("Health Center")
    expect(health.bg).toContain("rose")

    const fallback = getCategoryBadgeClasses(null)
    expect(fallback.bg).toContain("slate")
  })
})
