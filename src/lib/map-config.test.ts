import { describe, expect, it } from "vitest"
import {
  CARTO_POSITRON_TILE_CONFIG,
  DEFAULT_TILE_CONFIG,
  OUTLINE_LABEL_MIN_ZOOM,
} from "./map-config"

describe("map-config", () => {
  it("includes both OpenStreetMap and CARTO in the attribution string", () => {
    expect(CARTO_POSITRON_TILE_CONFIG.attribution).toContain("OpenStreetMap")
    expect(CARTO_POSITRON_TILE_CONFIG.attribution).toContain("CARTO")
    expect(DEFAULT_TILE_CONFIG.attribution).toContain("OpenStreetMap")
    expect(DEFAULT_TILE_CONFIG.attribution).toContain("CARTO")
  })

  it("configures CARTO Positron tile URL and subdomains correctly", () => {
    expect(CARTO_POSITRON_TILE_CONFIG.url).toBe(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
    )
    expect(CARTO_POSITRON_TILE_CONFIG.subdomains).toBe("abcd")
    expect(CARTO_POSITRON_TILE_CONFIG.maxZoom).toBe(20)
  })

  it("defines OUTLINE_LABEL_MIN_ZOOM as 17", () => {
    expect(OUTLINE_LABEL_MIN_ZOOM).toBe(17)
  })
})
