import { describe, expect, it } from "vitest"
import { diagnosePedestrianGraph, distanceMeters } from "./pedestrian-graph-utils"
import type { LocationEntrance, PedestrianGraphNode, PedestrianPath } from "./types"

const path: PedestrianPath = {
  id: "path-a", name: "North walk", geometry: { type: "LineString", coordinates: [[120, 10], [120.001, 10]] },
  path_type: "walkway", wheelchair_accessible: true, surface: null, notes: null, is_active: true,
  created_at: "", updated_at: "",
}
const entrance: LocationEntrance = { id: "entrance-a", location_id: "location-a", name: "Main door", lat: 10, lng: 120, accessibility: null, created_at: "" }
const node: PedestrianGraphNode = { id: "node-a", kind: "entrance", name: "Main door", lat: 10, lng: 120, level: null, entrance_id: entrance.id, created_at: "", updated_at: "" }

describe("pedestrian graph diagnostics", () => {
  it("uses only explicit connections and reports dangling endpoints and entrances", () => {
    const result = diagnosePedestrianGraph([path], [entrance], [], [])
    expect(result).toHaveLength(3)
    expect(result.some((item) => item.id === "entrance:entrance-a")).toBe(true)
  })

  it("recognizes explicit endpoint links without inferring nearby connectivity", () => {
    const result = diagnosePedestrianGraph([path], [entrance], [node], [
      { path_id: path.id, vertex_index: 0, node_id: node.id, created_at: "" },
    ])
    expect(result.map((item) => item.id)).toEqual(["endpoint:path-a:1"])
  })

  it("detects inconsistent link positions and calculates distance", () => {
    const displaced = { ...node, lat: 10.001 }
    const result = diagnosePedestrianGraph([path], [], [displaced], [
      { path_id: path.id, vertex_index: 0, node_id: displaced.id, created_at: "" },
    ])
    expect(result.some((item) => item.id === "drift:path-a:0")).toBe(true)
    expect(distanceMeters({ lat: 10, lng: 120 }, displaced)).toBeGreaterThan(100)
  })

  it("flags geometric crossings as review candidates instead of treating them as connected", () => {
    const crossingPath: PedestrianPath = {
      ...path, id: "path-b", name: "East walk",
      geometry: { type: "LineString", coordinates: [[120.0005, 9.9995], [120.0005, 10.0005]] },
    }
    const result = diagnosePedestrianGraph([path, crossingPath], [], [], [])
    expect(result.some((item) => item.id.startsWith("crossing:path-a:path-b") && item.message.includes("interior crossing"))).toBe(true)
  })

  it("flags T-junctions for explicit review without connecting them", () => {
    const branch: PedestrianPath = {
      ...path, id: "path-branch", name: "Branch",
      geometry: { type: "LineString", coordinates: [[120.0005, 10], [120.0005, 10.0005]] },
    }
    const result = diagnosePedestrianGraph([path, branch], [], [], [])
    expect(result.some((item) => item.id.startsWith("crossing:path-a:path-branch") && item.message.includes("T-junction"))).toBe(true)
    expect(result.filter((item) => item.id.startsWith("endpoint:"))).toHaveLength(4)
  })

  it("reports multiple separate crossings between the same two paths", () => {
    const weavingPath: PedestrianPath = {
      ...path, id: "path-weaving", name: "Weaving path",
      geometry: {
        type: "LineString",
        coordinates: [
          [120.00025, 9.9995], [120.00025, 10.0005],
          [120.00075, 10.0005], [120.00075, 9.9995],
        ],
      },
    }
    const result = diagnosePedestrianGraph([path, weavingPath], [], [], [])
    expect(result.filter((item) => item.id.startsWith("crossing:path-a:path-weaving"))).toHaveLength(2)
  })

  it("flags stale node and connection references", () => {
    const staleNode = { ...node, id: "stale-node", entrance_id: "missing-entrance" }
    const result = diagnosePedestrianGraph([path], [], [staleNode], [
      { path_id: "missing-path", vertex_index: 0, node_id: "missing-node", created_at: "" },
    ])
    expect(result.some((item) => item.id === "node-entrance:stale-node")).toBe(true)
    expect(result.some((item) => item.id === "invalid:missing-path:0")).toBe(true)
  })

  it("flags canonical entrance drift even if the node remains near its path vertex", () => {
    const displacedEntrance = { ...entrance, lat: 10 }
    const nearPathNode = { ...node, lat: 10.00003 }
    const nearPath: PedestrianPath = {
      ...path, geometry: { type: "LineString", coordinates: [[120, 10.00003], [120.001, 10.00003]] },
    }
    const result = diagnosePedestrianGraph([nearPath], [displacedEntrance], [nearPathNode], [
      { path_id: nearPath.id, vertex_index: 0, node_id: nearPathNode.id, created_at: "" },
    ])
    expect(distanceMeters(nearPathNode, { lat: 10.00003, lng: 120 })).toBeLessThan(2)
    expect(result.some((item) => item.id === `entrance-drift:${nearPathNode.id}`)).toBe(true)
  })

  it("flags stairs marked wheelchair accessible and conflicting connected path flags", () => {
    const stairs: PedestrianPath = { ...path, id: "stairs", path_type: "stairs", wheelchair_accessible: true }
    const conflictingPath: PedestrianPath = {
      ...path, id: "conflicting", name: "Restricted branch", wheelchair_accessible: false,
      geometry: { type: "LineString", coordinates: [[120.001, 10], [120.002, 10]] },
    }
    const junction: PedestrianGraphNode = {
      id: "junction", kind: "junction", name: null, lat: 10, lng: 120.001,
      level: null, entrance_id: null, created_at: "", updated_at: "",
    }
    const result = diagnosePedestrianGraph([stairs, conflictingPath], [], [junction], [
      { path_id: stairs.id, vertex_index: 1, node_id: junction.id, created_at: "" },
      { path_id: conflictingPath.id, vertex_index: 0, node_id: junction.id, created_at: "" },
    ])
    expect(result.some((item) => item.id === "stairs-accessibility:stairs")).toBe(true)
    expect(result.some((item) => item.id === "accessibility:junction")).toBe(true)
  })
})
