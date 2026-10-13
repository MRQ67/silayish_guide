export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type LocationType = "building" | "office" | "dorm" | "lab" | "facility"

export type FeedbackStatus = "open" | "reviewed" | "resolved"

export type ProfileRole = "admin"

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          icon: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          icon?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          icon?: string | null
          created_at?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          id: string
          name: string
          type: LocationType
          parent_id: string | null
          category_id: string | null
          description: string | null
          lat: number | null
          lng: number | null
          floor: number | null
          opening_hours: string | null
          photo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
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
        Update: {
          id?: string
          name?: string
          type?: LocationType
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
        Relationships: [
          {
            foreignKeyName: "locations_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_parent_id_fkey"
            columns: ["parent_id"]
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          id: string
          name: string
          description: string | null
          location_id: string | null
          hours: string | null
          contact: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          location_id?: string | null
          hours?: string | null
          contact?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          location_id?: string | null
          hours?: string | null
          contact?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_location_id_fkey"
            columns: ["location_id"]
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_reports: {
        Row: {
          id: string
          location_id: string | null
          message: string
          status: FeedbackStatus
          created_at: string
        }
        Insert: {
          id?: string
          location_id?: string | null
          message: string
          status?: FeedbackStatus
          created_at?: string
        }
        Update: {
          id?: string
          location_id?: string | null
          message?: string
          status?: FeedbackStatus
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_reports_location_id_fkey"
            columns: ["location_id"]
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          role: ProfileRole
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: ProfileRole
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: ProfileRole
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
  }
}
