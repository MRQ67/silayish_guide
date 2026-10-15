import { describe, expect, it, vi } from "vitest"
import { verifyAdmin } from "./auth"

describe("verifyAdmin", () => {
  it("returns isAdmin: false and user: null when no user is authenticated", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
      from: vi.fn(),
    }

    const result = await verifyAdmin(mockSupabase as never)

    expect(result).toEqual({ isAdmin: false, user: null })
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  it("returns isAdmin: false when user exists but has no profile row", async () => {
    const mockUser = { id: "user-456", email: "user@example.com" }
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    })

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      }),
    }

    const result = await verifyAdmin(mockSupabase as never)

    expect(result).toEqual({ isAdmin: false, user: mockUser })
    expect(mockSupabase.from).toHaveBeenCalledWith("profiles")
    expect(mockSelect).toHaveBeenCalledWith("role")
    expect(mockEq).toHaveBeenCalledWith("id", "user-456")
  })

  it("returns isAdmin: true when user exists and has admin profile role", async () => {
    const mockAdminUser = { id: "admin-123", email: "admin@example.com" }
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { role: "admin" },
      error: null,
    })

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockAdminUser },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      }),
    }

    const result = await verifyAdmin(mockSupabase as never)

    expect(result).toEqual({ isAdmin: true, user: mockAdminUser })
  })

  it("returns isAdmin: false and passes error when profile query fails", async () => {
    const mockUser = { id: "user-789", email: "test@example.com" }
    const dbError = new Error("Database query failed")
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: dbError,
    })

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      }),
    }

    const result = await verifyAdmin(mockSupabase as never)

    expect(result).toEqual({
      isAdmin: false,
      user: mockUser,
      error: dbError,
    })
  })
})
