import { describe, expect, it } from "vitest"
import type { LocationEntrance, PedestrianGraphNode, PedestrianPath, PedestrianPathConnection } from "@/lib/types"
import { calculatePedestrianRoute, calculateRouteFromGps, snapGpsToPedestrianNetwork } from "./pedestrian-routing"

const path = (id: string, coords: number[][], extra: Partial<PedestrianPath> = {}): PedestrianPath => ({
  id, name: id, geometry: { type: "LineString", coordinates: coords }, path_type: "walkway", wheelchair_accessible: true,
  surface: null, notes: null, is_active: true, created_at: "", updated_at: "", ...extra,
})
const entrance = (id: string, locationId: string, lng: number): LocationEntrance => ({ id, location_id: locationId, name: id, lat: 10, lng, accessibility: null, created_at: "" })
const node = (id: string, lng: number, entranceId: string | null = null): PedestrianGraphNode => ({ id, kind: entranceId ? "entrance" : "junction", name: id, lat: 10, lng, level: null, entrance_id: entranceId, created_at: "", updated_at: "" })
const conn = (pathId: string, vertex_index: number, node_id: string): PedestrianPathConnection => ({ path_id: pathId, vertex_index, node_id, created_at: "" })
const basic = () => {
  const entrances = [entrance("a", "building-a", 120), entrance("b", "building-b", 120.002)]
  const nodes = [node("a-node", 120, "a"), node("junction", 120.001), node("b-node", 120.002, "b")]
  const paths = [path("east", [[120, 10], [120.001, 10]]), path("west", [[120.001, 10], [120.002, 10]])]
  const connections = [conn("east", 0, "a-node"), conn("east", 1, "junction"), conn("west", 0, "junction"), conn("west", 1, "b-node")]
  return { entrances, nodes, paths, connections }
}

describe("pedestrian routing", () => {
  it("routes over multiple explicitly connected paths and assembles line geometry", () => {
    const result = calculatePedestrianRoute(basic(), "a", "b")
    expect(result.status).toBe("ok")
    if (result.status === "ok") expect(result.route.coordinates).toEqual([[120, 10], [120.001, 10], [120.002, 10]])
  })
  it("preserves reversed LineString traversal", () => {
    const data = basic()
    data.paths[0] = path("east", [[120.001, 10], [120, 10]])
    data.connections[0] = conn("east", 1, "a-node")
    data.connections[1] = conn("east", 0, "junction")
    const result = calculatePedestrianRoute(data, "a", "b")
    expect(result.status === "ok" && result.route.coordinates[0]).toEqual([120, 10])
  })
  it("chooses the shortest among candidate routes", () => {
    const data = basic()
    data.paths.push(path("long", [[120, 10], [120, 10.002], [120.002, 10]]))
    data.nodes.push(node("detour", 120.001, null))
    data.connections.push(conn("long", 0, "a-node"), conn("long", 1, "detour"), conn("long", 2, "b-node"))
    const result = calculatePedestrianRoute(data, "a", "b")
    expect(result.status === "ok" && result.route.pathIds).toEqual(["east", "west"])
  })
  it("returns no route for disconnected entrances and missing entrance data", () => {
    const data = basic(); data.connections = data.connections.slice(0, 2)
    expect(calculatePedestrianRoute(data, "a", "b").status).toBe("no-route")
    expect(calculatePedestrianRoute(data, "missing", "b").status).toBe("no-route")
  })
  it("ignores inactive paths and never connects a geometric crossing", () => {
    const data = basic(); data.paths[0] = path("east", [[120, 10], [120.001, 10]], { is_active: false })
    expect(calculatePedestrianRoute(data, "a", "b").status).toBe("no-route")
    const crossing = basic(); crossing.paths.push(path("cross", [[120.0005, 9.999], [120.0005, 10.001]]))
    expect(calculatePedestrianRoute(crossing, "a", "b").status).toBe("ok")
  })
  it("filters inaccessible paths and stairs even if stairs are marked accessible", () => {
    const data = basic(); data.paths[0] = path("east", [[120, 10], [120.001, 10]], { wheelchair_accessible: false })
    expect(calculatePedestrianRoute(data, "a", "b", true).status).toBe("no-route")
    data.paths[0] = { ...path("east", [[120, 10], [120.001, 10]]), wheelchair_accessible: undefined as unknown as boolean }
    expect(calculatePedestrianRoute(data, "a", "b", true).status).toBe("no-route")
    data.paths[0] = { ...path("east", [[120, 10], [120.001, 10]]), path_type: "unknown" as PedestrianPath["path_type"] }
    expect(calculatePedestrianRoute(data, "a", "b", true).status).toBe("no-route")
    data.paths[0] = path("east", [[120, 10], [120.001, 10]], { path_type: "stairs", wheelchair_accessible: true })
    expect(calculatePedestrianRoute(data, "a", "b", true).status).toBe("no-route")
  })
  it("rejects stale references and malformed geometry without throwing", () => {
    const data = basic(); data.connections.push(conn("gone", 0, "missing")); data.connections.push(conn("east", 99, "a-node"))
    data.paths[0] = path("east", [[120, 10], [Number.NaN, 10]])
    expect(() => calculatePedestrianRoute(data, "a", "b")).not.toThrow()
    expect(calculatePedestrianRoute(data, "a", "b").status).toBe("no-route")
  })
  it("calculates positive distance and safely handles zero-length segments", () => {
    const result = calculatePedestrianRoute(basic(), "a", "b")
    expect(result.status === "ok" && result.route.distanceMeters).toBeGreaterThan(0)
    const data = basic(); data.paths[0] = path("east", [[120, 10], [120, 10]])
    expect(() => calculatePedestrianRoute(data, "a", "b")).not.toThrow()
  })
  it("snaps GPS only to a connected node within the safe radius", () => {
    const data = basic()
    expect(snapGpsToPedestrianNetwork(data, { lat: 10, lng: 120 })?.nodeId).toBe("a-node")
    expect(snapGpsToPedestrianNetwork(data, { lat: 10, lng: 120.01 })).toBeNull()
    expect(calculateRouteFromGps(data, { lat: 10, lng: 120 }, "b").status).toBe("ok")
    expect(calculateRouteFromGps(data, { lat: 10, lng: 120.01 }, "b").status).toBe("no-route")
  })
  it("does not treat an unconnected nearby node as a safe GPS snap", () => {
    const data = basic()
    data.nodes.push(node("orphan", 120.00001))
    expect(snapGpsToPedestrianNetwork(data, { lat: 10, lng: 120.00001 })?.nodeId).not.toBe("orphan")
  })
})
