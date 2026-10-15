import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  DEFAULT_LOCATION_ERROR_MESSAGE,
  handleDatabaseMutationError,
  handleLocationError,
} from "./errors"

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

describe("handleDatabaseMutationError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns specific duplicate code message for Postgres error 23505", () => {
    const error = {
      code: "23505",
      message: 'duplicate key value violates unique constraint "locations_code_key"',
    }
    const result = handleDatabaseMutationError(error)

    expect(result).toBe("That code is already used by another location.")
    expect(console.error).not.toHaveBeenCalled()
  })

  it("returns specific foreign key message for Postgres error 23503", () => {
    const error = {
      code: "23503",
      message: 'update or delete on table "locations" violates foreign key constraint',
    }
    const result = handleDatabaseMutationError(error)

    expect(result).toBe("This location still has places inside it. Move or delete them first.")
    expect(console.error).not.toHaveBeenCalled()
  })

  it("logs and returns generic message for unhandled errors", () => {
    const genericError = new Error("Unexpected database disconnection")
    const result = handleDatabaseMutationError(genericError, "[admin] update failed")

    expect(result).toBe(DEFAULT_LOCATION_ERROR_MESSAGE)
    expect(result).not.toContain("Unexpected database disconnection")
    expect(console.error).toHaveBeenCalledWith("[admin] update failed", genericError)
  })
})

