import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  DEFAULT_TILE_CONFIG,
  getTileLayerConfig,
  OUTLINE_LABEL_MIN_ZOOM,
  resetCartoWarning,
} from "./map-config"

describe("map-config", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_CARTO_BASEMAPS_KEY", "")
    resetCartoWarning()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  describe("with a key", () => {
    it("contains the key in the URL and credits both OpenStreetMap and CARTO", () => {
      const testKey = "test-carto-key-12345"
      vi.stubEnv("NEXT_PUBLIC_CARTO_BASEMAPS_KEY", testKey)
      const config = getTileLayerConfig(testKey)

      expect(config.url).toBe(
        `https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png?key=${testKey}`
      )
      expect(config.url).toContain(testKey)
      expect(config.subdomains).toBe("abcd")
      expect(config.maxZoom).toBe(20)
      expect(config.attribution).toContain("OpenStreetMap")
      expect(config.attribution).toContain("CARTO")
    })

    it("uses the key from environment when called with no argument", () => {
      const testKey = "test-carto-key-12345"
      vi.stubEnv("NEXT_PUBLIC_CARTO_BASEMAPS_KEY", testKey)
      const config = getTileLayerConfig()

      expect(config.url).toBe(
        `https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png?key=${testKey}`
      )
      expect(config.url).toContain(testKey)
      expect(config.subdomains).toBe("abcd")
      expect(config.maxZoom).toBe(20)
      expect(config.attribution).toContain("OpenStreetMap")
      expect(config.attribution).toContain("CARTO")
    })
  })

  describe("without a key", () => {
    it("falls back to OpenStreetMap tiles when key is undefined", () => {
      const config = getTileLayerConfig(undefined)

      expect(config.url).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png")
      expect(config.subdomains).toBe("abc")
      expect(config.maxZoom).toBe(19)
      expect(config.attribution).toContain("OpenStreetMap")
      expect(config.attribution).not.toContain("CARTO")
      expect(config.url).not.toContain("key=")
      expect(config.attribution).not.toContain("key=")
    })

    it("falls back to OpenStreetMap tiles when called with no argument and env is empty", () => {
      const config = getTileLayerConfig()

      expect(config.url).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png")
      expect(config.subdomains).toBe("abc")
      expect(config.maxZoom).toBe(19)
      expect(config.attribution).toContain("OpenStreetMap")
      expect(config.attribution).not.toContain("CARTO")
      expect(config.url).not.toContain("key=")
      expect(config.attribution).not.toContain("key=")
    })

    it("falls back to OpenStreetMap tiles when key is empty or whitespace", () => {
      const emptyConfig = getTileLayerConfig("")
      expect(emptyConfig.url).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png")
      expect(emptyConfig.attribution).not.toContain("CARTO")
      expect(emptyConfig.url).not.toContain("key=")

      const whitespaceConfig = getTileLayerConfig("   ")
      expect(whitespaceConfig.url).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png")
      expect(whitespaceConfig.attribution).not.toContain("CARTO")
      expect(whitespaceConfig.url).not.toContain("key=")
    })

    it("never prints the key in the returned config", () => {
      const config = getTileLayerConfig(undefined)
      expect(config.url).not.toContain("key=")
      expect(config.attribution).not.toContain("key=")
    })
  })

  describe("development warning", () => {
    it("logs exactly one console warning in development mode when key is missing", () => {
      vi.stubEnv("NODE_ENV", "development")
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      getTileLayerConfig(undefined)
      expect(warnSpy).toHaveBeenCalledTimes(1)
      expect(warnSpy.mock.calls[0][0]).toContain(
        "NEXT_PUBLIC_CARTO_BASEMAPS_KEY is missing"
      )
      expect(warnSpy.mock.calls[0][0]).not.toContain("key=")

      // Calling again should not trigger another warning
      getTileLayerConfig(undefined)
      expect(warnSpy).toHaveBeenCalledTimes(1)
    })

    it("does not log warning in non-development environments", () => {
      vi.stubEnv("NODE_ENV", "test")
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      getTileLayerConfig(undefined)
      expect(warnSpy).not.toHaveBeenCalled()
    })

    it("does not log warning when key is present", () => {
      vi.stubEnv("NODE_ENV", "development")
      vi.stubEnv("NEXT_PUBLIC_CARTO_BASEMAPS_KEY", "test-carto-key")
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      getTileLayerConfig()
      expect(warnSpy).not.toHaveBeenCalled()
    })
  })

  describe("constants and defaults", () => {
    it("defines OUTLINE_LABEL_MIN_ZOOM as 17", () => {
      expect(OUTLINE_LABEL_MIN_ZOOM).toBe(17)
    })

    it("exports DEFAULT_TILE_CONFIG as a valid TileLayerConfig", () => {
      expect(DEFAULT_TILE_CONFIG).toBeDefined()
      expect(typeof DEFAULT_TILE_CONFIG.url).toBe("string")
      expect(typeof DEFAULT_TILE_CONFIG.attribution).toBe("string")
      expect(typeof DEFAULT_TILE_CONFIG.maxZoom).toBe("number")
    })
  })
})

