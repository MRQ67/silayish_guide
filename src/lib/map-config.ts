export interface TileLayerConfig {
  url: string
  subdomains: string
  maxZoom: number
  attribution: string
}

let hasWarnedMissingCartoKey = false

/**
 * Resets the warning flag for missing CARTO key (used in tests).
 */
export function resetCartoWarning(): void {
  hasWarnedMissingCartoKey = false
}

/**
 * Builds the Leaflet TileLayer configuration.
 * - When a CARTO API key is provided: uses CARTO Positron raster tiles with maxZoom 20
 *   and attribution crediting both OpenStreetMap and CARTO.
 * - When the key is missing or empty: falls back to standard OpenStreetMap tiles with
 *   maxZoom 19 and attribution crediting only OpenStreetMap contributors.
 *   In development mode, logs one console warning and avoids watermarked tiles.
 */
export function getTileLayerConfig(
  cartoKey: string | undefined = process.env.NEXT_PUBLIC_CARTO_BASEMAPS_KEY
): TileLayerConfig {
  const trimmedKey = cartoKey?.trim()

  if (trimmedKey) {
    return {
      url: `https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png?key=${encodeURIComponent(trimmedKey)}`,
      subdomains: "abcd",
      maxZoom: 20,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }
  }

  if (process.env.NODE_ENV === "development" && !hasWarnedMissingCartoKey) {
    console.warn(
      "[map-config] NEXT_PUBLIC_CARTO_BASEMAPS_KEY is missing. Falling back to OpenStreetMap tiles."
    )
    hasWarnedMissingCartoKey = true
  }

  return {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    subdomains: "abc",
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }
}

export const DEFAULT_TILE_CONFIG: TileLayerConfig = getTileLayerConfig()

export const OUTLINE_LABEL_MIN_ZOOM = 17
