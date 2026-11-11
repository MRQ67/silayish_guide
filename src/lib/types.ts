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

export interface LineString extends GeoJsonObject {
  type: "LineString"
  coordinates: Position[]
}

export type PedestrianPathType = "walkway" | "ramp" | "stairs" | "other"

export interface PedestrianPath {
  id: string
  name: string
  geometry: LineString
  path_type: PedestrianPathType
  wheelchair_accessible: boolean
  surface: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PedestrianGraphNode {
  id: string
  kind: "junction" | "entrance"
  name: string | null
  lat: number
  lng: number
  level: string | null
  entrance_id: string | null
  created_at: string
  updated_at: string
}

export interface PedestrianPathConnection {
  path_id: string
  vertex_index: number
  node_id: string
  created_at: string
}

export interface Feature<
  G = Polygon | MultiPolygon,
  P = Record<string, unknown>,
> extends GeoJsonObject {
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
  color?: string | null
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

export interface LocationEntrance {
  id: string
  location_id: string
  name: string
  lat: number
  lng: number
  accessibility: string | null
  created_at: string
}

export interface Service {
  id: string
  name: string
  description?: string | null
  location_id?: string | null
  hours?: string | null
  contact?: string | null
  created_at?: string
  location?: Location | null
}

export type FeedbackStatus = "open" | "reviewed" | "resolved"

export interface FeedbackReport {
  id: string
  location_id: string | null
  message: string
  status: FeedbackStatus
  created_at: string
}
