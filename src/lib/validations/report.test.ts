import { describe, expect, it } from "vitest"
import {
  deleteReportSchema,
  isHoneypotTriggered,
  submitReportSchema,
  updateReportStatusSchema,
} from "./report"
import { attachLocationToReports, type LocationLookupItem } from "@/lib/report-utils"

describe("report validations and utilities", () => {
  const validUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
  const anotherUuid = "b1ffcd88-8d1a-4fe7-aa5c-5aa8ac270b22"

  describe("submitReportSchema", () => {
    it("validates a valid report and trims message", () => {
      const result = submitReportSchema.safeParse({
        location_id: validUuid,
        message: "  The main entrance door is stuck.  ",
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.location_id).toBe(validUuid)
        expect(result.data.message).toBe("The main entrance door is stuck.")
      }
    })

    it("rejects an empty message", () => {
      const result = submitReportSchema.safeParse({
        location_id: validUuid,
        message: "",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.message).toBeDefined()
      }
    })

    it("rejects whitespace-only message", () => {
      const result = submitReportSchema.safeParse({
        location_id: validUuid,
        message: "     ",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.message).toBeDefined()
      }
    })

    it("accepts a message with exactly 1000 characters", () => {
      const longMessage = "x".repeat(1000)
      const result = submitReportSchema.safeParse({
        location_id: validUuid,
        message: longMessage,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.message.length).toBe(1000)
      }
    })

    it("rejects a message with 1001 characters", () => {
      const tooLongMessage = "x".repeat(1001)
      const result = submitReportSchema.safeParse({
        location_id: validUuid,
        message: tooLongMessage,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.message).toBeDefined()
      }
    })

    it("rejects an invalid UUID for location_id", () => {
      const invalidUuids = [
        "not-a-uuid",
        "12345",
        "a0eebc99-9c0b-4ef8-bb6d",
        "",
      ]

      for (const badUuid of invalidUuids) {
        const result = submitReportSchema.safeParse({
          location_id: badUuid,
          message: "Valid issue description",
        })

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.flatten().fieldErrors.location_id).toBeDefined()
        }
      }
    })
  })

  describe("honeypot behavior", () => {
    it("returns false when honeypot field is missing or empty", () => {
      expect(isHoneypotTriggered({})).toBe(false)
      expect(isHoneypotTriggered({ website: "" })).toBe(false)
      expect(isHoneypotTriggered({ website: undefined })).toBe(false)
      expect(isHoneypotTriggered({ website: "   " })).toBe(false)
      expect(isHoneypotTriggered({ hp: "" })).toBe(false)
    })

    it("returns true when honeypot field is filled", () => {
      expect(isHoneypotTriggered({ website: "http://spam-link.example.com" })).toBe(true)
      expect(isHoneypotTriggered({ hp: "bot-input" })).toBe(true)
    })
  })

  describe("status change schema", () => {
    it("accepts valid status updates", () => {
      const statuses = ["open", "reviewed", "resolved"] as const

      for (const status of statuses) {
        const result = updateReportStatusSchema.safeParse({
          id: validUuid,
          status,
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.status).toBe(status)
          expect(result.data.id).toBe(validUuid)
        }
      }
    })

    it("rejects an invalid status", () => {
      const invalidStatuses = ["closed", "pending", "in_progress", "unknown", ""]

      for (const status of invalidStatuses) {
        const result = updateReportStatusSchema.safeParse({
          id: validUuid,
          status,
        })

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.flatten().fieldErrors.status).toBeDefined()
        }
      }
    })

    it("rejects bad UUID in status change", () => {
      const result = updateReportStatusSchema.safeParse({
        id: "invalid-report-id",
        status: "reviewed",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.id).toBeDefined()
      }
    })

    it("validates deleteReportSchema with valid and invalid UUIDs", () => {
      expect(deleteReportSchema.safeParse({ id: validUuid }).success).toBe(true)
      expect(deleteReportSchema.safeParse({ id: "bad-uuid" }).success).toBe(false)
    })
  })

  describe("attachLocationToReports", () => {
    const locations: LocationLookupItem[] = [
      {
        id: validUuid,
        name: "Engineering Hall",
        code: "B-002",
      },
      {
        id: anotherUuid,
        name: "Library Complex",
        code: null,
      },
    ]

    it("attaches location when found", () => {
      const reports = [
        {
          id: "rep-1",
          location_id: validUuid,
          message: "Door lock broken",
          status: "open" as const,
          created_at: "2026-10-19T10:00:00Z",
        },
      ]

      const joined = attachLocationToReports(reports, locations)

      expect(joined).toHaveLength(1)
      expect(joined[0].location).toEqual({
        id: validUuid,
        name: "Engineering Hall",
        code: "B-002",
      })
    })

    it("sets location to null when location is missing (e.g. deleted)", () => {
      const reports = [
        {
          id: "rep-2",
          location_id: "c2eedd77-7e2b-4bc6-884b-4bb7ab160c33",
          message: "Water leak in old building",
          status: "open" as const,
          created_at: "2026-10-19T11:00:00Z",
        },
      ]

      const joined = attachLocationToReports(reports, locations)

      expect(joined).toHaveLength(1)
      expect(joined[0].location).toBeNull()
    })

    it("sets location to null when location_id is null", () => {
      const reports = [
        {
          id: "rep-3",
          location_id: null,
          message: "General campus pathway lights not working",
          status: "open" as const,
          created_at: "2026-10-19T12:00:00Z",
        },
      ]

      const joined = attachLocationToReports(reports, locations)

      expect(joined).toHaveLength(1)
      expect(joined[0].location).toBeNull()
    })
  })
})
