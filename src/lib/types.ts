export type Position = number[]

export interface GeoJsonObject {
  type: string
  bbox?: number[]
}

export interface Polygon extends GeoJsonObject {
  type: "Polygon"
  coordinates: Position[][]
}

export interface MultiPolygon extends GeoJsonObject {
  type: "MultiPolygon"
  coordinates: Position[][][]
}

export interface Feature<G = Polygon | MultiPolygon, P = Record<string, unknown>>
  extends GeoJsonObject {
  type: "Feature"
  geometry: G
  properties: P | null
  id?: string | number
}

export interface FeatureCollection<
  G = Polygon | MultiPolygon,
  P = Record<string, unknown>,
> extends GeoJsonObject {
  type: "FeatureCollection"
  features: Feature<G, P>[]
}

export type LocationType = "building" | "office" | "dorm" | "lab" | "facility"

export interface Category {
  id: string
  name: string
  icon?: string | null
}

export interface Location {
  id: string
  name: string
  code: string | null
  type: LocationType
  parent_id?: string | null
  category_id?: string | null
  category?: Category | null
  description?: string | null
  lat?: number | null
  lng?: number | null
  floor?: number | null
  opening_hours?: string | null
  photo_url?: string | null
  outline?: Polygon | MultiPolygon | null
  created_at?: string
  updated_at?: string
}
