import type {
  LocationEntrance,
  PedestrianGraphNode,
  PedestrianPath,
  PedestrianPathConnection,
} from "@/lib/types"

export const GRAPH_LINK_TOLERANCE_METERS = 2

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = radians(b.lat - a.lat)
  const dLng = radians(b.lng - a.lng)
  const haversine = Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371000 * 2 * Math.asin(Math.sqrt(haversine))
}

export interface GraphDiagnostic {
  id: string
  message: string
}

function segmentIntersection(a: number[], b: number[], c: number[], d: number[]) {
  const abx = b[0] - a[0], aby = b[1] - a[1]
  const cdx = d[0] - c[0], cdy = d[1] - c[1]
  const denominator = abx * cdy - aby * cdx
  if (Math.abs(denominator) < 1e-12) return null
  const acx = c[0] - a[0], acy = c[1] - a[1]
  const t = (acx * cdy - acy * cdx) / denominator
  const u = (acx * aby - acy * abx) / denominator
  const epsilon = 1e-9
  if (t < -epsilon || t > 1 + epsilon || u < -epsilon || u > 1 + epsilon) return null
  const clampedT = Math.max(0, Math.min(1, t))
  const clampedU = Math.max(0, Math.min(1, u))
  return {
    lng: a[0] + clampedT * abx,
    lat: a[1] + clampedT * aby,
    leftEndpoint: clampedT <= epsilon || clampedT >= 1 - epsilon,
    rightEndpoint: clampedU <= epsilon || clampedU >= 1 - epsilon,
  }
}

/** Reports missing explicit links; it deliberately does not infer connectivity from coordinates. */
export function diagnosePedestrianGraph(
  paths: readonly PedestrianPath[],
  entrances: readonly LocationEntrance[],
  nodes: readonly PedestrianGraphNode[],
  connections: readonly PedestrianPathConnection[]
): GraphDiagnostic[] {
  const diagnostics: GraphDiagnostic[] = []
  const pathsById = new Map(paths.map((path) => [path.id, path]))
  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const linkedNodes = new Set(connections
    .filter((connection) => pathsById.get(connection.path_id)?.is_active)
    .map((connection) => connection.node_id))

  for (const path of paths) {
    if (path.path_type === "stairs" && path.wheelchair_accessible) {
      diagnostics.push({ id: `stairs-accessibility:${path.id}`, message: `${path.name}: stairs are marked wheelchair accessible; verify and correct the path metadata.` })
    }
  }
  for (const path of paths.filter((item) => item.is_active)) {
    for (const index of [0, path.geometry.coordinates.length - 1]) {
      const connection = connections.find((item) => item.path_id === path.id && item.vertex_index === index)
      if (!connection || !nodesById.has(connection.node_id)) {
        diagnostics.push({ id: `endpoint:${path.id}:${index}`, message: `${path.name}: endpoint ${index === 0 ? "start" : "end"} has no explicit graph connection.` })
      }
    }
  }
  for (const entrance of entrances) {
    const entranceNode = nodes.find((node) => node.entrance_id === entrance.id)
    if (!entranceNode || !linkedNodes.has(entranceNode.id)) {
      diagnostics.push({ id: `entrance:${entrance.id}`, message: `${entrance.name}: entrance is not connected to a path.` })
    }
  }
  for (const connection of connections) {
    const path = pathsById.get(connection.path_id)
    const node = nodesById.get(connection.node_id)
    const point = path?.geometry.coordinates[connection.vertex_index]
    if (!path || !node || !point) {
      diagnostics.push({ id: `invalid:${connection.path_id}:${connection.vertex_index}`, message: "A graph connection references a missing path, vertex, or node." })
    } else if (distanceMeters({ lng: point[0], lat: point[1] }, node) > GRAPH_LINK_TOLERANCE_METERS) {
      diagnostics.push({ id: `drift:${connection.path_id}:${connection.vertex_index}`, message: `${path.name}: connected vertex is more than 2 meters from its graph node.` })
    }
  }
  for (const node of nodes) {
    if ((node.kind === "entrance") !== (node.entrance_id !== null)) {
      diagnostics.push({ id: `node-kind:${node.id}`, message: "A graph node has an inconsistent type and entrance reference." })
    }
    if (node.entrance_id) {
      const entrance = entrances.find((item) => item.id === node.entrance_id)
      if (!entrance) {
        diagnostics.push({ id: `node-entrance:${node.id}`, message: "An entrance graph node references a missing entrance." })
      } else if (distanceMeters(node, { lat: entrance.lat, lng: entrance.lng }) > GRAPH_LINK_TOLERANCE_METERS) {
        diagnostics.push({ id: `entrance-drift:${node.id}`, message: `${entrance.name}: graph node is more than 2 meters from its canonical entrance.` })
      }
    }
  }
  const pathsAtNode = new Map<string, PedestrianPath[]>()
  for (const connection of connections) {
    const path = pathsById.get(connection.path_id)
    if (!path?.is_active) continue
    const connected = pathsAtNode.get(connection.node_id) ?? []
    connected.push(path)
    pathsAtNode.set(connection.node_id, connected)
  }
  for (const [nodeId, connectedPaths] of pathsAtNode) {
    if (new Set(connectedPaths.map((path) => path.wheelchair_accessible)).size > 1) {
      diagnostics.push({ id: `accessibility:${nodeId}`, message: "Connected paths disagree about wheelchair accessibility; verify the junction and approach." })
    }
  }
  const activePaths = paths.filter((path) => path.is_active)
  for (let leftIndex = 0; leftIndex < activePaths.length; leftIndex++) {
    const left = activePaths[leftIndex]
    for (let rightIndex = leftIndex + 1; rightIndex < activePaths.length; rightIndex++) {
      const right = activePaths[rightIndex]
      const reportedCrossings = new Set<string>()
      for (let i = 0; i < left.geometry.coordinates.length - 1; i++) {
        for (let j = 0; j < right.geometry.coordinates.length - 1; j++) {
          const crossing = segmentIntersection(left.geometry.coordinates[i], left.geometry.coordinates[i + 1], right.geometry.coordinates[j], right.geometry.coordinates[j + 1])
          if (!crossing) continue
          const sharedAtCrossing = connections.some((connection) => {
            if (connection.path_id !== left.id && connection.path_id !== right.id) return false
            const node = nodesById.get(connection.node_id)
            if (!node || distanceMeters(node, crossing) > GRAPH_LINK_TOLERANCE_METERS) return false
            const linkedPathIds = new Set(connections.filter((other) => other.node_id === node.id).map((other) => other.path_id))
            return linkedPathIds.has(left.id) && linkedPathIds.has(right.id)
          })
          if (!sharedAtCrossing) {
            const crossingKey = `${crossing.lat.toFixed(7)}:${crossing.lng.toFixed(7)}`
            if (reportedCrossings.has(crossingKey)) continue
            reportedCrossings.add(crossingKey)
            const kind = crossing.leftEndpoint !== crossing.rightEndpoint
              ? "T-junction"
              : crossing.leftEndpoint && crossing.rightEndpoint
                ? "endpoint meeting"
                : "interior crossing"
            diagnostics.push({ id: `crossing:${left.id}:${right.id}:${i}:${j}`, message: `${left.name} and ${right.name} have a geometric ${kind}; verify grade and explicitly connect only if walkable.` })
          }
        }
      }
    }
  }
  return diagnostics
}
