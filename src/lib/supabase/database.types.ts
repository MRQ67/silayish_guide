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
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          icon?: string | null
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          icon?: string | null
          color?: string | null
          created_at?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          id: string
          name: string
          code: string | null
          type: LocationType
          parent_id: string | null
          category_id: string | null
          description: string | null
          lat: number | null
          lng: number | null
          floor: number | null
          opening_hours: string | null
          photo_url: string | null
          outline: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          type: LocationType
          parent_id?: string | null
          category_id?: string | null
          description?: string | null
          lat?: number | null
          lng?: number | null
          floor?: number | null
          opening_hours?: string | null
          photo_url?: string | null
          outline?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          type?: LocationType
          parent_id?: string | null
          category_id?: string | null
          description?: string | null
          lat?: number | null
          lng?: number | null
          floor?: number | null
          opening_hours?: string | null
          photo_url?: string | null
          outline?: Json | null
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
      location_entrances: {
        Row: {
          id: string
          location_id: string
          name: string
          lat: number
          lng: number
          accessibility: string | null
          created_at: string
        }
        Insert: {
          id?: string
          location_id: string
          name: string
          lat: number
          lng: number
          accessibility?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          location_id?: string
          name?: string
          lat?: number
          lng?: number
          accessibility?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_entrances_location_id_fkey"
            columns: ["location_id"]
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      pedestrian_paths: {
        Row: {
          id: string
          name: string
          geometry: Json
          path_type: string
          wheelchair_accessible: boolean
          surface: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          geometry: Json
          path_type: string
          wheelchair_accessible: boolean
          surface?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          geometry?: Json
          path_type?: string
          wheelchair_accessible?: boolean
          surface?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      pedestrian_graph_nodes: {
        Row: { id: string; kind: string; name: string | null; lat: number; lng: number; level: string | null; entrance_id: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; kind: string; name?: string | null; lat: number; lng: number; level?: string | null; entrance_id?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; kind?: string; name?: string | null; lat?: number; lng?: number; level?: string | null; entrance_id?: string | null; created_at?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "pedestrian_graph_nodes_entrance_id_fkey"; columns: ["entrance_id"]; referencedRelation: "location_entrances"; referencedColumns: ["id"] }]
      }
      pedestrian_path_connections: {
        Row: { path_id: string; vertex_index: number; node_id: string; created_at: string }
        Insert: { path_id: string; vertex_index: number; node_id: string; created_at?: string }
        Update: { path_id?: string; vertex_index?: number; node_id?: string; created_at?: string }
        Relationships: [
          { foreignKeyName: "pedestrian_path_connections_path_id_fkey"; columns: ["path_id"]; referencedRelation: "pedestrian_paths"; referencedColumns: ["id"] },
          { foreignKeyName: "pedestrian_path_connections_node_id_fkey"; columns: ["node_id"]; referencedRelation: "pedestrian_graph_nodes"; referencedColumns: ["id"] }
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
    Views: {
      [_ in never]: never
    }
    Functions: {
      replace_location_entrances: {
        Args: { p_location_id: string; p_entrances: Json }
        Returns: {
          id: string
          location_id: string
          name: string
          lat: number
          lng: number
          accessibility: string | null
          created_at: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
