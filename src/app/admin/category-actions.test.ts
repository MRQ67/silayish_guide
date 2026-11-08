import { describe, expect, it, vi } from "vitest"

const mockRequireAdmin = vi.fn()
const mockRevalidatePath = vi.fn()
vi.mock("@/lib/auth", () => ({ requireAdmin: () => mockRequireAdmin() }))
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

import { deleteCategoryAction, saveCategoryAction } from "./category-actions"

describe("category actions", () => {
  it("requires an admin before saving", async () => {
    mockRequireAdmin.mockRejectedValueOnce(new Error("Unauthorized"))
    await expect(
      saveCategoryAction({ name: "New", color: "#123456" })
    ).rejects.toThrow("Unauthorized")
  })

  it("persists validated category data and revalidates public/admin routes", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn(() => ({ insert }))
    mockRequireAdmin.mockResolvedValueOnce({ supabase: { from } })
    const result = await saveCategoryAction({
      name: "Science",
      icon: "users",
      color: "#123456",
    })
    expect(result.success).toBe(true)
    expect(from).toHaveBeenCalledWith("categories")
    expect(insert).toHaveBeenCalledWith({
      name: "Science",
      icon: "users",
      color: "#123456",
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith("/")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/categories")
  })

  it("refuses deletion when locations use the category", async () => {
    const eq = vi.fn().mockResolvedValue({ count: 2, error: null })
    const select = vi.fn(() => ({ eq }))
    mockRequireAdmin.mockResolvedValueOnce({
      supabase: { from: vi.fn(() => ({ select })) },
    })
    const result = await deleteCategoryAction(
      "11111111-1111-1111-1111-111111111111"
    )
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/assigned to locations/i)
    expect(eq).toHaveBeenCalledWith(
      "category_id",
      "11111111-1111-1111-1111-111111111111"
    )
  })
})
