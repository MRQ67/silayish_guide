import { connection } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { handleLocationError } from "@/lib/errors"
import type {
  Location,
  LocationEntrance,
  PedestrianPath,
} from "@/lib/types"
import { AdminHeader } from "@/components/admin/admin-header"
import { PedestrianPathManager } from "@/components/admin/pedestrian-path-manager"

export const instant = false

export default async function PedestrianPathsPage() {
  await connection()
  const { supabase, user } = await requireAdmin()
  const [pathsResult, locationsResult, entrancesResult] = await Promise.all([
    supabase.from("pedestrian_paths").select("*").order("name"),
    supabase
      .from("locations")
      .select("id, name, code, type, lat, lng, outline")
      .order("name"),
    supabase
      .from("location_entrances")
      .select("id, location_id, name, lat, lng, accessibility, created_at")
      .order("name"),
  ])
  const [nodesResult, connectionsResult] = await Promise.all([
    supabase.from("pedestrian_graph_nodes").select("*").order("created_at"),
    supabase.from("pedestrian_path_connections").select("*"),
  ])

  const error = pathsResult.error || locationsResult.error || entrancesResult.error || nodesResult.error || connectionsResult.error
  const paths = (pathsResult.data as unknown as PedestrianPath[] | null) ?? []
  const locations = (locationsResult.data as unknown as Location[] | null) ?? []
  const entrances =
    (entrancesResult.data as LocationEntrance[] | null) ?? []

  return (
    <div className="min-h-screen bg-background font-sans">
      <AdminHeader userEmail={user.email} activeSection="paths" />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Pedestrian Paths
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Map campus walkways and access details. Paths are independent
            geometry records; their endpoints are not assumed to connect to one
            another or to a building entrance.
          </p>
        </div>
        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          >
            {handleLocationError(error, "[admin] pedestrian paths load failed")}
          </div>
        ) : (
          <PedestrianPathManager
            initialPaths={paths}
            locations={locations}
            entrances={entrances}
            graphNodes={(nodesResult.data ?? []) as import("@/lib/types").PedestrianGraphNode[]}
            connections={(connectionsResult.data ?? []) as import("@/lib/types").PedestrianPathConnection[]}
          />
        )}
      </main>
    </div>
  )
}
