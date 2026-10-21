import { describe, expect, it } from "vitest"
import {
  deleteReportSchema,
  isHoneypotTriggered,
  submitReportSchema,
  updateReportStatusSchema,
} from "./report"
import {
  attachLocationToReports,
  checkMutationAffectedRow,
  clampPageNumber,
  formatDate,
  getResetPaginationUrl,
  INVALID_DATE_FALLBACK,
  isPaginationOutOfRangeError,
  REPORT_NOT_FOUND_MESSAGE,
  type LocationLookupItem,
} from "@/lib/report-utils"

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
    it("returns false when honeypot fields are missing, empty, or whitespace", () => {
      expect(isHoneypotTriggered({})).toBe(false)
      expect(isHoneypotTriggered({ website: "" })).toBe(false)
      expect(isHoneypotTriggered({ hp: "" })).toBe(false)
      expect(isHoneypotTriggered({ website: "", hp: "" })).toBe(false)
      expect(isHoneypotTriggered({ website: undefined })).toBe(false)
      expect(isHoneypotTriggered({ hp: undefined })).toBe(false)
      expect(isHoneypotTriggered({ website: "   " })).toBe(false)
      expect(isHoneypotTriggered({ hp: "   \t\n " })).toBe(false)
      expect(isHoneypotTriggered({ website: "  ", hp: "  " })).toBe(false)
    })

    it("returns false for non-string values", () => {
      expect(isHoneypotTriggered({ website: 12345 })).toBe(false)
      expect(isHoneypotTriggered({ hp: true })).toBe(false)
      expect(isHoneypotTriggered({ website: null, hp: null })).toBe(false)
    })

    it("returns true when website field has non-empty content", () => {
      expect(
        isHoneypotTriggered({ website: "http://spam-link.example.com" })
      ).toBe(true)
      expect(isHoneypotTriggered({ website: "x", hp: "" })).toBe(true)
    })

    it("returns true when hp field has non-empty content even if website is empty string", () => {
      expect(isHoneypotTriggered({ hp: "bot-input" })).toBe(true)
      expect(isHoneypotTriggered({ website: "", hp: "x" })).toBe(true)
    })

    it("returns true when both honeypot fields have content", () => {
      expect(isHoneypotTriggered({ website: "bot1", hp: "bot2" })).toBe(true)
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
      const invalidStatuses = [
        "closed",
        "pending",
        "in_progress",
        "unknown",
        "",
      ]

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
      expect(deleteReportSchema.safeParse({ id: "bad-uuid" }).success).toBe(
        false
      )
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

  describe("zero-row mutation helper: checkMutationAffectedRow", () => {
    it("returns affected: false when data array is empty", () => {
      const result = checkMutationAffectedRow([])
      expect(result.affected).toBe(false)
      if (!result.affected) {
        expect(result.message).toBe(REPORT_NOT_FOUND_MESSAGE)
      }
    })

    it("returns affected: false when data is null or undefined", () => {
      const nullResult = checkMutationAffectedRow(null)
      expect(nullResult.affected).toBe(false)
      if (!nullResult.affected) {
        expect(nullResult.message).toBe(REPORT_NOT_FOUND_MESSAGE)
      }

      const undefinedResult = checkMutationAffectedRow(undefined)
      expect(undefinedResult.affected).toBe(false)
      if (!undefinedResult.affected) {
        expect(undefinedResult.message).toBe(REPORT_NOT_FOUND_MESSAGE)
      }
    })

    it("returns affected: true with rows when at least one row was affected", () => {
      const rows = [{ id: validUuid }]
      const result = checkMutationAffectedRow(rows)
      expect(result.affected).toBe(true)
      if (result.affected) {
        expect(result.rows).toEqual(rows)
      }
    })
  })

  describe("pagination helpers", () => {
    describe("clampPageNumber", () => {
      it("preserves positive integer strings", () => {
        expect(clampPageNumber("1")).toBe(1)
        expect(clampPageNumber("5")).toBe(5)
        expect(clampPageNumber(" 10 ")).toBe(10)
      })

      it("preserves positive numbers", () => {
        expect(clampPageNumber(1)).toBe(1)
        expect(clampPageNumber(8)).toBe(8)
      })

      it("clamps zero and negative values to 1", () => {
        expect(clampPageNumber("0")).toBe(1)
        expect(clampPageNumber("-1")).toBe(1)
        expect(clampPageNumber("-99")).toBe(1)
        expect(clampPageNumber(0)).toBe(1)
        expect(clampPageNumber(-5)).toBe(1)
      })

      it("clamps non-numeric, empty, null, or undefined values to 1", () => {
        expect(clampPageNumber("abc")).toBe(1)
        expect(clampPageNumber("")).toBe(1)
        expect(clampPageNumber("   ")).toBe(1)
        expect(clampPageNumber(null)).toBe(1)
        expect(clampPageNumber(undefined)).toBe(1)
      })

      it("truncates positive float strings to integer or clamps non-positive floats to 1", () => {
        expect(clampPageNumber("3.7")).toBe(3)
        expect(clampPageNumber(3.7)).toBe(1)
        expect(clampPageNumber("-2.5")).toBe(1)
      })
    })

    describe("isPaginationOutOfRangeError", () => {
      it("returns true for PostgREST PGRST103 error", () => {
        expect(isPaginationOutOfRangeError({ code: "PGRST103" })).toBe(true)
        expect(
          isPaginationOutOfRangeError({
            code: "PGRST103",
            message: "Requested range not satisfiable",
          })
        ).toBe(true)
      })

      it("returns false for other database error codes or non-objects", () => {
        expect(isPaginationOutOfRangeError({ code: "PGRST116" })).toBe(false)
        expect(isPaginationOutOfRangeError({ code: "23505" })).toBe(false)
        expect(isPaginationOutOfRangeError(new Error("Something failed"))).toBe(
          false
        )
        expect(isPaginationOutOfRangeError(null)).toBe(false)
        expect(isPaginationOutOfRangeError(undefined)).toBe(false)
        expect(isPaginationOutOfRangeError("PGRST103")).toBe(false)
      })
    })

    describe("getResetPaginationUrl", () => {
      it("returns URL targeting page 1 for the given status", () => {
        expect(getResetPaginationUrl("open")).toBe(
          "/admin/reports?status=open&page=1"
        )
        expect(getResetPaginationUrl("reviewed")).toBe(
          "/admin/reports?status=reviewed&page=1"
        )
        expect(getResetPaginationUrl("resolved")).toBe(
          "/admin/reports?status=resolved&page=1"
        )
        expect(getResetPaginationUrl("all")).toBe(
          "/admin/reports?status=all&page=1"
        )
      })

      it("defaults to open status for unrecognized or missing status", () => {
        expect(getResetPaginationUrl(undefined)).toBe(
          "/admin/reports?status=open&page=1"
        )
        expect(getResetPaginationUrl("unknown")).toBe(
          "/admin/reports?status=open&page=1"
        )
      })
    })
  })

  describe("date formatting: formatDate", () => {
    it("formats ISO timestamps consistently in Africa/Addis_Ababa time zone", () => {
      // 10:30 UTC is 13:30 in Africa/Addis_Ababa (UTC+3)
      const formatted = formatDate("2026-10-19T10:30:00Z")
      expect(formatted).toContain("Oct 19, 2026")
      expect(formatted).toContain("1:30")
      expect(formatted).toContain("PM")
    })

    it("formats midnight UTC timestamps consistently with timezone offset", () => {
      // 00:00 UTC on Jan 1 is 03:00 on Jan 1 in Africa/Addis_Ababa
      const formatted = formatDate("2026-01-01T00:00:00Z")
      expect(formatted).toContain("Jan 1, 2026")
      expect(formatted).toContain("3:00")
      expect(formatted).toContain("AM")
    })

    it("returns fallback for invalid date strings", () => {
      expect(formatDate("not-a-date")).toBe(INVALID_DATE_FALLBACK)
      expect(formatDate("2026-99-99T99:99:99Z")).toBe(INVALID_DATE_FALLBACK)
    })

    it("returns fallback for null, undefined, or empty strings", () => {
      expect(formatDate(null)).toBe(INVALID_DATE_FALLBACK)
      expect(formatDate(undefined)).toBe(INVALID_DATE_FALLBACK)
      expect(formatDate("")).toBe(INVALID_DATE_FALLBACK)
    })
  })
})
