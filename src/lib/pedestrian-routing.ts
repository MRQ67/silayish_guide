import type { LocationEntrance, PedestrianGraphNode, PedestrianPath, PedestrianPathConnection, Position } from "@/lib/types"
import { distanceMeters } from "@/lib/pedestrian-graph-utils"

export const GPS_SNAP_LIMIT_METERS = 35
export const APPROX_WALKING_METERS_PER_MINUTE = 80

export interface PedestrianRoute {
  coordinates: Position[]
  distanceMeters: number
  approximateMinutes: number
  wheelchairAccessible: boolean
  wheelchairWarning: string | null
  pathIds: string[]
  startNodeId: string
  destinationNodeId: string
}

export type RouteResult =
  | { status: "ok"; route: PedestrianRoute }
  | { status: "no-route"; reason: string }

type RoutingData = {
  paths: readonly PedestrianPath[]
  nodes: readonly PedestrianGraphNode[]
  connections: readonly PedestrianPathConnection[]
  entrances: readonly LocationEntrance[]
}

type Edge = { to: string; pathId: string; distance: number; coordinates: Position[]; accessible: boolean }

function validPoint(point: Position | undefined): point is Position {
  return !!point && point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90
}

function lineDistance(points: readonly Position[]) {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += distanceMeters({ lng: points[i - 1][0], lat: points[i - 1][1] }, { lng: points[i][0], lat: points[i][1] })
  }
  return total
}

function buildGraph(data: RoutingData, wheelchair: boolean) {
  const nodes = new Map(data.nodes.filter((node) => Number.isFinite(node.lat) && Number.isFinite(node.lng)).map((node) => [node.id, node]))
  const paths = new Map(data.paths.filter((path) => path.is_active && path.geometry?.type === "LineString" && Array.isArray(path.geometry.coordinates) && path.geometry.coordinates.length >= 2).map((path) => [path.id, path]))
  const byPath = new Map<string, PedestrianPathConnection[]>()
  for (const connection of data.connections) {
    const list = byPath.get(connection.path_id) ?? []
    list.push(connection)
    byPath.set(connection.path_id, list)
  }
  const adjacency = new Map<string, Edge[]>()
  for (const id of nodes.keys()) adjacency.set(id, [])
  for (const [pathId, path] of paths) {
    const coordinates = path.geometry.coordinates
    if (!coordinates.every(validPoint)) continue
    // Accessibility metadata is a required boolean; stairs are always excluded.
    // Ordinary walking assumes every path is bidirectional, per the campus model.
    const knownNonStairType = path.path_type === "walkway" || path.path_type === "ramp" || path.path_type === "other"
    const accessible = path.wheelchair_accessible === true && knownNonStairType
    if (wheelchair && !accessible) continue
    const attached = (byPath.get(pathId) ?? []).filter((item) =>
      Number.isInteger(item.vertex_index) && item.vertex_index >= 0 && item.vertex_index < coordinates.length && nodes.has(item.node_id)
    ).sort((a, b) => a.vertex_index - b.vertex_index)
    for (let i = 1; i < attached.length; i++) {
      const from = attached[i - 1]
      const to = attached[i]
      if (from.node_id === to.node_id) continue
      const segment = coordinates.slice(from.vertex_index, to.vertex_index + 1)
      if (segment.length < 2) continue
      const distance = lineDistance(segment)
      if (!Number.isFinite(distance)) continue
      adjacency.get(from.node_id)?.push({ to: to.node_id, pathId, distance, coordinates: segment, accessible })
      adjacency.get(to.node_id)?.push({ to: from.node_id, pathId, distance, coordinates: [...segment].reverse(), accessible })
    }
  }
  return { adjacency, nodes }
}

function shortestPath(adjacency: Map<string, Edge[]>, start: string, end: string) {
  const distances = new Map<string, number>([[start, 0]])
  const previous = new Map<string, { nodeId: string; edge: Edge }>()
  const pending = new Set(adjacency.keys())
  while (pending.size) {
    let current: string | null = null
    let best = Infinity
    for (const id of pending) {
      const distance = distances.get(id) ?? Infinity
      if (distance < best) { best = distance; current = id }
    }
    if (current === null || !Number.isFinite(best)) break
    if (current === end) break
    pending.delete(current)
    for (const edge of adjacency.get(current) ?? []) {
      if (!pending.has(edge.to)) continue
      const next = best + edge.distance
      if (next < (distances.get(edge.to) ?? Infinity)) {
        distances.set(edge.to, next)
        previous.set(edge.to, { nodeId: current, edge })
      }
    }
  }
  if (!distances.has(end)) return null
  const edges: Edge[] = []
  let cursor = end
  while (cursor !== start) {
    const step = previous.get(cursor)
    if (!step) return null
    edges.unshift(step.edge)
    cursor = step.nodeId
  }
  return { edges, distance: distances.get(end) ?? 0 }
}

export function calculatePedestrianRoute(data: RoutingData, startEntranceId: string, destinationEntranceId: string, wheelchair = false): RouteResult {
  const startEntrance = data.entrances.find((entrance) => entrance.id === startEntranceId)
  const destinationEntrance = data.entrances.find((entrance) => entrance.id === destinationEntranceId)
  if (!startEntrance || !destinationEntrance) return { status: "no-route", reason: "The selected entrance is missing or stale. Choose another entrance." }
  const startNode = data.nodes.find((node) => node.kind === "entrance" && node.entrance_id === startEntranceId)
  const destinationNode = data.nodes.find((node) => node.kind === "entrance" && node.entrance_id === destinationEntranceId)
  if (!startNode || !destinationNode) return { status: "no-route", reason: "This entrance is not connected to the pedestrian network. Choose a connected entrance." }
  return calculateBetweenNodes(data, startNode.id, destinationNode.id, wheelchair)
}

export function snapGpsToPedestrianNetwork(data: RoutingData, position: { lat: number; lng: number }, maxDistance = GPS_SNAP_LIMIT_METERS, wheelchair = false) {
  const { adjacency, nodes } = buildGraph(data, wheelchair)
  let nearest: { nodeId: string; distance: number } | null = null
  for (const [nodeId, edges] of adjacency) {
    if (edges.length === 0) continue
    const node = nodes.get(nodeId)!
    const distance = distanceMeters(position, node)
    if (distance <= maxDistance && (!nearest || distance < nearest.distance)) nearest = { nodeId, distance }
  }
  return nearest
}

export function calculateRouteFromGps(data: RoutingData, position: { lat: number; lng: number }, destinationEntranceId: string, wheelchair = false): RouteResult {
  const snap = snapGpsToPedestrianNetwork(data, position, GPS_SNAP_LIMIT_METERS, wheelchair)
  if (!snap) return { status: "no-route", reason: "No verified pedestrian connection is close enough to your location. Choose a starting entrance instead." }
  const destination = data.nodes.find((node) => node.kind === "entrance" && node.entrance_id === destinationEntranceId)
  if (!destination) return { status: "no-route", reason: "The destination entrance is not connected to the pedestrian network." }
  const result = calculateBetweenNodes(data, snap.nodeId, destination.id, wheelchair)
  if (result.status === "no-route") return result
  const start = { lng: position.lng, lat: position.lat }
  const snapNode = data.nodes.find((node) => node.id === snap.nodeId)!
  const connector: Position[] = [[start.lng, start.lat], [snapNode.lng, snapNode.lat]]
  const coordinates = snap.distance < 0.1 ? result.route.coordinates : [...connector, ...result.route.coordinates.slice(1)]
  const connectorLength = snap.distance < 0.1 ? 0 : snap.distance
  return { status: "ok", route: { ...result.route, coordinates, distanceMeters: result.route.distanceMeters + connectorLength, approximateMinutes: Math.max(1, Math.round((result.route.distanceMeters + connectorLength) / APPROX_WALKING_METERS_PER_MINUTE)), startNodeId: snap.nodeId } }
}

function calculateBetweenNodes(data: RoutingData, startNodeId: string, destinationNodeId: string, wheelchair: boolean): RouteResult {
  const { adjacency, nodes } = buildGraph(data, wheelchair)
  if (!nodes.has(startNodeId) || !nodes.has(destinationNodeId)) return { status: "no-route", reason: "A selected entrance has stale pedestrian graph data." }
  const found = shortestPath(adjacency, startNodeId, destinationNodeId)
  if (!found) return { status: "no-route", reason: "No connected pedestrian route is available between these entrances." }
  const coordinates: Position[] = []
  for (const edge of found.edges) {
    for (const point of edge.coordinates) {
      const last = coordinates.at(-1)
      if (!last || last[0] !== point[0] || last[1] !== point[1]) coordinates.push(point)
    }
  }
  if (!coordinates.length) {
    const node = nodes.get(startNodeId)!
    coordinates.push([node.lng, node.lat])
  }
  const accessible = found.edges.every((edge) => edge.accessible)
  const warning = wheelchair ? null : "Wheelchair accessibility has not been guaranteed for this walking route."
  return { status: "ok", route: { coordinates, distanceMeters: found.distance, approximateMinutes: Math.max(1, Math.round(found.distance / APPROX_WALKING_METERS_PER_MINUTE)), wheelchairAccessible: accessible, wheelchairWarning: warning, pathIds: found.edges.map((edge) => edge.pathId), startNodeId, destinationNodeId } }
}
