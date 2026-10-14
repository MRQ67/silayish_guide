export type LocationType = "building" | "office" | "dorm" | "lab" | "facility"

export interface Location {
  id: string
  name: string
  code: string | null
  type: LocationType
  parent_id?: string | null
  category_id?: string | null
  description?: string | null
  lat?: number | null
  lng?: number | null
  floor?: number | null
  opening_hours?: string | null
  photo_url?: string | null
  created_at?: string
  updated_at?: string
}
