import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockRequireAdmin, mockFrom, mockInsert, mockUpdate, mockDelete, mockEq, mockSelect, mockSingle } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockFrom: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockEq: vi.fn(),
  mockSelect: vi.fn(),
  mockSingle: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({ requireAdmin: () => mockRequireAdmin() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import {
  deletePedestrianPathAction,
  unlinkPathVertexAction,
  savePedestrianPathAction,
} from "./pedestrian-path-actions"

const pathId = "44444444-4444-4444-8444-444444444444"
const rawPath = {
  id: pathId,
  name: "Main walkway",
  geometry: {
    type: "LineString",
    coordinates: [[41.836, 9.617], [41.837, 9.618]],
  },
  path_type: "walkway",
  wheelchair_accessible: true,
  surface: null,
  notes: null,
  is_active: true,
}

describe("pedestrian path actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({ supabase: { from: mockFrom } })
    mockFrom.mockReturnValue({
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })
    mockInsert.mockReturnValue({ select: mockSelect })
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockDelete.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ single: mockSingle })
  })

  it("rejects invalid geometry before writing", async () => {
    const result = await savePedestrianPathAction({
      ...rawPath,
      geometry: { type: "LineString", coordinates: [[41, 9]] },
    })

    expect(result.success).toBe(false)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it("requires an admin before creating a valid path", async () => {
    mockSingle.mockResolvedValue({ data: rawPath, error: null })
    const result = await savePedestrianPathAction({ ...rawPath, id: undefined })

    expect(result.success).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith("pedestrian_paths")
    expect(mockInsert).toHaveBeenCalledOnce()
  })

  it("updates and deletes paths through the admin guarded actions", async () => {
    mockSingle.mockResolvedValue({ data: rawPath, error: null })
    await savePedestrianPathAction(rawPath)
    expect(mockUpdate).toHaveBeenCalledOnce()

    mockEq.mockResolvedValue({ error: null })
    const deleted = await deletePedestrianPathAction(pathId)
    expect(deleted.success).toBe(true)
    expect(mockDelete).toHaveBeenCalledOnce()
    expect(mockRequireAdmin).toHaveBeenCalledTimes(2)
  })

  it("does not write when server-side admin authorization fails", async () => {
    mockRequireAdmin.mockRejectedValue(new Error("Unauthorized"))

    await expect(savePedestrianPathAction(rawPath)).rejects.toThrow("Unauthorized")
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it("requires an admin to unlink a vertex and delegates orphan cleanup to the database trigger", async () => {
    const finalEq = vi.fn().mockResolvedValue({ error: null })
    mockDelete.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ eq: finalEq })

    const result = await unlinkPathVertexAction(pathId, 0)

    expect(result.success).toBe(true)
    expect(mockRequireAdmin).toHaveBeenCalledOnce()
    expect(mockFrom).toHaveBeenCalledWith("pedestrian_path_connections")
    expect(mockDelete).toHaveBeenCalledOnce()
    expect(mockEq).toHaveBeenCalledWith("path_id", pathId)
    expect(finalEq).toHaveBeenCalledWith("vertex_index", 0)
  })

  it("does not unlink graph connections when admin authorization fails", async () => {
    mockRequireAdmin.mockRejectedValue(new Error("Unauthorized"))
    await expect(unlinkPathVertexAction(pathId, 0)).rejects.toThrow("Unauthorized")
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
