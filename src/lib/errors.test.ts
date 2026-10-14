import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DEFAULT_LOCATION_ERROR_MESSAGE, handleLocationError } from "./errors"

describe("handleLocationError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns generic message for an Error instance", () => {
    const error = new Error("Database connection refused on port 5432")
    const result = handleLocationError(error)

    expect(result).toBe(DEFAULT_LOCATION_ERROR_MESSAGE)
    expect(result).not.toContain("Database connection refused on port 5432")
    expect(console.error).toHaveBeenCalledWith(
      "[locations] failed to load",
      error
    )
  })

  it("returns generic message for a Supabase-style error object", () => {
    const supabaseError = {
      message: 'relation "public.locations" does not exist',
      code: "42P01",
      details: "Table missing in schema",
      hint: "Check migrations",
    }
    const result = handleLocationError(supabaseError)

    expect(result).toBe(DEFAULT_LOCATION_ERROR_MESSAGE)
    expect(result).not.toContain("public.locations")
    expect(result).not.toContain("42P01")
    expect(console.error).toHaveBeenCalledWith(
      "[locations] failed to load",
      supabaseError
    )
  })

  it("returns generic message for a string error", () => {
    const stringError = "Missing NEXT_PUBLIC_SUPABASE_URL environment variable."
    const result = handleLocationError(stringError)

    expect(result).toBe(DEFAULT_LOCATION_ERROR_MESSAGE)
    expect(result).not.toContain("NEXT_PUBLIC_SUPABASE_URL")
    expect(console.error).toHaveBeenCalledWith(
      "[locations] failed to load",
      stringError
    )
  })

  it("returns generic message for undefined", () => {
    const result = handleLocationError(undefined)

    expect(result).toBe(DEFAULT_LOCATION_ERROR_MESSAGE)
    expect(console.error).toHaveBeenCalledWith(
      "[locations] failed to load",
      undefined
    )
  })

  it("allows custom context label while preserving generic message and logging original error", () => {
    const err = new Error("Network timeout during fetch")
    const customLabel = "[locations] custom failure"
    const result = handleLocationError(err, customLabel)

    expect(result).toBe(DEFAULT_LOCATION_ERROR_MESSAGE)
    expect(result).not.toContain("Network timeout during fetch")
    expect(console.error).toHaveBeenCalledWith(customLabel, err)
  })
})
