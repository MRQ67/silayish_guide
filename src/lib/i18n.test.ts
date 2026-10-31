import { describe, expect, it } from "vitest"
import {
  formatDistance,
  getLocalizedCategoryName,
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
  })

  it("formats distances properly in both English and Amharic", () => {
    expect(formatDistance(150, "en")).toBe("~150 m away")
    expect(formatDistance(150, "am")).toBe("~150 ሜትር ርቀት")

    expect(formatDistance(1250, "en")).toBe("~1.3 km away")
    expect(formatDistance(1250, "am")).toBe("~1.3 ኪ.ሜ ርቀት")
  })
})
