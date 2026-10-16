export interface TileLayerConfig {
  url: string
  subdomains: string
  maxZoom: number
  attribution: string
}

export const CARTO_POSITRON_TILE_CONFIG: TileLayerConfig = {
  url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  subdomains: "abcd",
  maxZoom: 20,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
}

export const DEFAULT_TILE_CONFIG = CARTO_POSITRON_TILE_CONFIG

export const OUTLINE_LABEL_MIN_ZOOM = 17
