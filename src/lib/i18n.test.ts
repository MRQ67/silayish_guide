import { describe, expect, it } from "vitest"
import {
  formatDistance,
  formatProximityWithWalking,
  formatWalkingTime,
  getLocalizedCategoryName,
  getWalkingMinutes,
  translations,
} from "./i18n"

describe("i18n", () => {
  it("contains identical keys for both English and Amharic dictionaries", () => {
    const enKeys = Object.keys(translations.en).sort()
    const amKeys = Object.keys(translations.am).sort()
    expect(enKeys).toEqual(amKeys)
  })

  it("translates category names to Amharic and keeps English by default", () => {
    expect(getLocalizedCategoryName("Academics", "en")).toBe("Academics")
    expect(getLocalizedCategoryName("Academics", "am")).toBe("ትምህርት")
    expect(getLocalizedCategoryName("Administration", "am")).toBe("አስተዳደር")
    expect(getLocalizedCategoryName("Unknown Category", "am")).toBe("Unknown Category")
    expect(getLocalizedCategoryName(null, "am")).toBe("")
    expect(getLocalizedCategoryName(undefined, "am")).toBe("")
  })

  it("formats distances properly in both English and Amharic", () => {
    expect(formatDistance(150, "en")).toBe("~150 m away")
    expect(formatDistance(150, "am")).toBe("~150 ሜትር ርቀት")

    expect(formatDistance(1250, "en")).toBe("~1.3 km away")
    expect(formatDistance(1250, "am")).toBe("~1.3 ኪ.ሜ ርቀት")
  })

  it("calculates walking minutes based on standard walking speed", () => {
    expect(getWalkingMinutes(0)).toBe(1)
    expect(getWalkingMinutes(40)).toBe(1)
    expect(getWalkingMinutes(320)).toBe(4)
    expect(getWalkingMinutes(480)).toBe(6)
    expect(getWalkingMinutes(800)).toBe(10)
  })

  it("formats walking time strings in English and Amharic", () => {
    expect(formatWalkingTime(320, "en")).toBe("4 min walk")
    expect(formatWalkingTime(320, "am")).toBe("4 ደቂቃ እርምጃ")
  })

  it("formats combined walking ETA and distance", () => {
    expect(formatProximityWithWalking(320, "en")).toBe("4 min · 320 m")
    expect(formatProximityWithWalking(320, "am")).toBe("4 ደቂቃ · 320 ሜትር")
    expect(formatProximityWithWalking(1600, "en")).toBe("20 min · 1.6 km")
    expect(formatProximityWithWalking(1600, "am")).toBe("20 ደቂቃ · 1.6 ኪ.ሜ")
  })
})
