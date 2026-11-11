"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth"
import type { PedestrianPath } from "@/lib/types"
import { distanceMeters, GRAPH_LINK_TOLERANCE_METERS } from "@/lib/pedestrian-graph-utils"
import {
  pedestrianPathIdSchema,
  pedestrianPathSchema,
} from "@/lib/validations/pedestrian-path"

export interface PedestrianPathActionResult {
  success: boolean
  data?: PedestrianPath
  error?: string
  fieldErrors?: Record<string, string[]>
}

export async function savePedestrianPathAction(
  rawPath: Record<string, unknown>
): Promise<PedestrianPathActionResult> {
  const { supabase } = await requireAdmin()
  const parsed = pedestrianPathSchema.safeParse(rawPath)
  if (!parsed.success) {
    return {
      success: false,
      error: "Please correct the path details and geometry.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { id, ...values } = parsed.data
  const result = id
    ? await supabase
        .from("pedestrian_paths")
        .update(values)
        .eq("id", id)
        .select("*")
        .single()
    : await supabase
        .from("pedestrian_paths")
        .insert(values)
        .select("*")
        .single()

  if (result.error || !result.data) {
    console.error("[admin] pedestrian path save failed", result.error)
    return { success: false, error: "Unable to save this path." }
  }

  revalidatePath("/")
  revalidatePath("/admin/paths")
  return { success: true, data: result.data as unknown as PedestrianPath }
}

export async function deletePedestrianPathAction(
  rawId: string
): Promise<PedestrianPathActionResult> {
  const { supabase } = await requireAdmin()
  const id = pedestrianPathIdSchema.safeParse(rawId)
  if (!id.success) return { success: false, error: "Invalid path ID." }

  const { error } = await supabase
    .from("pedestrian_paths")
    .delete()
    .eq("id", id.data)
  if (error) {
    console.error("[admin] pedestrian path delete failed", error)
    return { success: false, error: "Unable to delete this path." }
  }

  revalidatePath("/")
  revalidatePath("/admin/paths")
  return { success: true }
}

export async function linkPathVertexAction(pathIdRaw: string, vertexIndexRaw: number, targetRaw: { kind: "junction"; nodeId?: string } | { kind: "entrance"; entranceId: string }) {
  const { supabase } = await requireAdmin()
  const pathId = pedestrianPathIdSchema.safeParse(pathIdRaw)
  if (!pathId.success || !Number.isInteger(vertexIndexRaw) || vertexIndexRaw < 0 || vertexIndexRaw >= 500)
    return { success: false, error: "Invalid path vertex." }

  const pathResult = await supabase.from("pedestrian_paths").select("id, geometry").eq("id", pathId.data).single()
  if (pathResult.error || !pathResult.data) return { success: false, error: "Path could not be loaded." }
  const geometry = pathResult.data.geometry as { type?: string; coordinates?: [number, number][] }
  const position = geometry.coordinates?.[vertexIndexRaw]
  if (geometry.type !== "LineString" || !position) return { success: false, error: "That path vertex does not exist." }

  let nodeId: string | null = null
  if (targetRaw.kind === "junction" && targetRaw.nodeId) {
    const nodeIdParsed = pedestrianPathIdSchema.safeParse(targetRaw.nodeId)
    if (!nodeIdParsed.success) return { success: false, error: "Invalid graph node." }
    const nodeResult = await supabase.from("pedestrian_graph_nodes").select("id, lat, lng, kind").eq("id", nodeIdParsed.data).single()
    if (nodeResult.error || !nodeResult.data || nodeResult.data.kind !== "junction") return { success: false, error: "Junction could not be loaded." }
    if (distanceMeters({ lng: position[0], lat: position[1] }, nodeResult.data) > GRAPH_LINK_TOLERANCE_METERS)
      return { success: false, error: "Move this path vertex within 2 meters of the junction before linking it." }
    nodeId = nodeResult.data.id
  } else if (targetRaw.kind === "entrance") {
    const entranceId = pedestrianPathIdSchema.safeParse(targetRaw.entranceId)
    if (!entranceId.success) return { success: false, error: "Invalid entrance." }
    const entranceResult = await supabase.from("location_entrances").select("id, lat, lng, name").eq("id", entranceId.data).single()
    if (entranceResult.error || !entranceResult.data) return { success: false, error: "Entrance could not be loaded." }
    if (distanceMeters({ lng: position[0], lat: position[1] }, { lat: entranceResult.data.lat, lng: entranceResult.data.lng }) > GRAPH_LINK_TOLERANCE_METERS)
      return { success: false, error: "Move the path vertex within 2 meters of this entrance before linking it." }
    const existing = await supabase.from("pedestrian_graph_nodes").select("id").eq("entrance_id", entranceId.data).maybeSingle()
    if (existing.data) nodeId = existing.data.id
    else {
      const created = await supabase.from("pedestrian_graph_nodes").insert({ kind: "entrance", entrance_id: entranceId.data, name: entranceResult.data.name, lat: entranceResult.data.lat, lng: entranceResult.data.lng }).select("id").single()
      if (created.error || !created.data) return { success: false, error: "Unable to prepare the entrance graph node." }
      nodeId = created.data.id
    }
  } else {
    const created = await supabase.from("pedestrian_graph_nodes").insert({ kind: "junction", name: null, lat: position[1], lng: position[0] }).select("id").single()
    if (created.error || !created.data) return { success: false, error: "Unable to create the junction node." }
    nodeId = created.data.id
  }

  const connected = await supabase.from("pedestrian_path_connections").upsert({ path_id: pathId.data, vertex_index: vertexIndexRaw, node_id: nodeId }, { onConflict: "path_id,vertex_index" })
  if (connected.error) {
    console.error("[admin] pedestrian graph connection failed", connected.error)
    return { success: false, error: "Unable to connect this path vertex. Check that the vertex and node positions match." }
  }
  revalidatePath("/admin/paths")
  return { success: true }
}

export async function unlinkPathVertexAction(pathIdRaw: string, vertexIndexRaw: number) {
  const { supabase } = await requireAdmin()
  const pathId = pedestrianPathIdSchema.safeParse(pathIdRaw)
  if (!pathId.success || !Number.isInteger(vertexIndexRaw) || vertexIndexRaw < 0 || vertexIndexRaw >= 500)
    return { success: false, error: "Invalid path vertex." }
  const { error } = await supabase.from("pedestrian_path_connections").delete().eq("path_id", pathId.data).eq("vertex_index", vertexIndexRaw)
  if (error) return { success: false, error: "Unable to remove this graph connection." }
  revalidatePath("/admin/paths")
  return { success: true }
}
