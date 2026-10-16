import { describe, expect, it } from "vitest"
import {
  attachParentNames,
  type LocationWithParentRelation,
} from "./location-utils"

describe("attachParentNames", () => {
  it("attaches parent name, id, and code when parent exists in the list", () => {
    const parentBuilding: LocationWithParentRelation = {
      id: "building-1",
      name: "Engineering Building",
      code: "ENG-01",
      parent_id: null,
    }
    const childRoom: LocationWithParentRelation = {
      id: "room-101",
      name: "Computer Lab 101",
      code: "LAB-101",
      parent_id: "building-1",
    }

    const result = attachParentNames([parentBuilding, childRoom])

    expect(result).toHaveLength(2)
    expect(result[0].parent).toBeNull()
    expect(result[1].parent).toEqual({
      id: "building-1",
      name: "Engineering Building",
      code: "ENG-01",
    })
  })

  it("sets parent code to null when the parent has no code", () => {
    const parentBuilding: LocationWithParentRelation = {
      id: "building-2",
      name: "Old Humanities Hall",
      code: null,
      parent_id: null,
    }
    const childRoom: LocationWithParentRelation = {
      id: "office-20",
      name: "Dean's Office",
      code: null,
      parent_id: "building-2",
    }

    const result = attachParentNames([parentBuilding, childRoom])

    expect(result[1].parent).toEqual({
      id: "building-2",
      name: "Old Humanities Hall",
      code: null,
    })
  })

  it("sets parent to null when parent_id is null or undefined", () => {
    const standaloneLocation: LocationWithParentRelation = {
      id: "stand-1",
      name: "Main Library",
      code: "LIB-01",
      parent_id: null,
    }
    const undefinedParentLocation: LocationWithParentRelation = {
      id: "stand-2",
      name: "Sports Complex",
      code: "SPT-01",
      parent_id: undefined,
    }

    const result = attachParentNames([
      standaloneLocation,
      undefinedParentLocation,
    ])

    expect(result[0].parent).toBeNull()
    expect(result[1].parent).toBeNull()
  })

  it("sets parent to null when parent_id is not found in the list", () => {
    const orphanLocation: LocationWithParentRelation = {
      id: "orphan-1",
      name: "Satellite Annex",
      code: "ANNEX-1",
      parent_id: "non-existent-parent-id",
    }

    const result = attachParentNames([orphanLocation])

    expect(result[0].parent).toBeNull()
  })

  it("handles an empty array safely", () => {
    const result = attachParentNames([])
    expect(result).toEqual([])
  })

  it("preserves additional location properties on items", () => {
    interface ExtendedLocation extends LocationWithParentRelation {
      floor: number
      customField: string
    }

    const items: ExtendedLocation[] = [
      {
        id: "b1",
        name: "Building 1",
        code: "B-1",
        parent_id: null,
        floor: 1,
        customField: "test",
      },
      {
        id: "r1",
        name: "Room 1",
        code: "R-1",
        parent_id: "b1",
        floor: 2,
        customField: "room-test",
      },
    ]

    const result = attachParentNames(items)
    expect(result[1].floor).toBe(2)
    expect(result[1].customField).toBe("room-test")
    expect(result[1].parent?.name).toBe("Building 1")
  })
})
