import { describe, expect, it, vi } from "vitest"

const mockRequireAdmin = vi.fn()
const mockRevalidatePath = vi.fn()
vi.mock("@/lib/auth", () => ({ requireAdmin: () => mockRequireAdmin() }))
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

import { saveLocationEntrancesAction } from "./entrance-actions"

const locationId = "11111111-1111-4111-8111-111111111111"
const entrance = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Main gate",
  lat: 9.6178,
  lng: 41.8362,
  accessibility: null,
}

function mockBuildingAdmin() {
  const maybeSingle = vi
    .fn()
    .mockResolvedValue({ data: { type: "building" }, error: null })
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const rpc = vi.fn().mockResolvedValue({ data: [entrance], error: null })
  const from = vi.fn(() => ({ select }))
  mockRequireAdmin.mockResolvedValueOnce({ supabase: { from, rpc } })
  return { from, rpc, eq }
}

describe("saveLocationEntrancesAction", () => {
  it("requires an admin", async () => {
    mockRequireAdmin.mockRejectedValueOnce(new Error("Unauthorized"))
    await expect(saveLocationEntrancesAction(locationId, [])).rejects.toThrow(
      "Unauthorized"
    )
  })

  it("validates entrance coordinates before calling the database", async () => {
    const { rpc } = mockBuildingAdmin()
    const result = await saveLocationEntrancesAction(locationId, [
      { ...entrance, lat: 91 },
    ])
    expect(result.success).toBe(false)
    expect(rpc).not.toHaveBeenCalled()
  })

  it("saves the full entrance set atomically for an existing building", async () => {
    const { rpc, eq } = mockBuildingAdmin()
    const result = await saveLocationEntrancesAction(locationId, [entrance])
    expect(result.success).toBe(true)
    expect(eq).toHaveBeenCalledWith("id", locationId)
    expect(rpc).toHaveBeenCalledWith("replace_location_entrances", {
      p_location_id: locationId,
      p_entrances: [entrance],
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/admin/locations/${locationId}/edit`
    )
  })
})
