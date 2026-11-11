import { describe, expect, it } from "vitest"
import {
  clampMobilePanelHeight,
  getMobilePanelBounds,
  getNearestSheetSnap,
} from "./mobile-panel-utils"

describe("mobile panel sizing", () => {
  it("enforces minimum and maximum heights at narrow mobile sizes", () => {
    expect(getMobilePanelBounds(600)).toEqual({ min: 128, max: 504 })
    expect(clampMobilePanelHeight(20, 600)).toBe(128)
    expect(clampMobilePanelHeight(900, 600)).toBe(504)
  })

  it("classifies nearby snap labels without changing the selected height", () => {
    expect(getNearestSheetSnap(140, 600)).toBe("peek")
    expect(getNearestSheetSnap(300, 600)).toBe("half")
    expect(getNearestSheetSnap(480, 600)).toBe("full")
    expect(clampMobilePanelHeight(380, 600)).toBe(380)
  })
})
