import { z } from "zod"
import { UUID_REGEX } from "./location"

export const reportMessageSchema = z
  .string()
  .trim()
  .min(1, "Please provide a description of the problem.")
  .max(1000, "Message must be 1000 characters or fewer.")

export const submitReportSchema = z.object({
  location_id: z.string().regex(UUID_REGEX, "Invalid location ID"),
  message: reportMessageSchema,
  website: z.string().optional(),
  hp: z.string().optional(),
})

export type SubmitReportInput = z.infer<typeof submitReportSchema>

export const reportStatusEnum = z.enum(["open", "reviewed", "resolved"])
export type FeedbackStatus = z.infer<typeof reportStatusEnum>

export const updateReportStatusSchema = z.object({
  id: z.string().regex(UUID_REGEX, "Invalid report ID"),
  status: reportStatusEnum,
})

export type UpdateReportStatusInput = z.infer<typeof updateReportStatusSchema>

export const deleteReportSchema = z.object({
  id: z.string().regex(UUID_REGEX, "Invalid report ID"),
})

export type DeleteReportInput = z.infer<typeof deleteReportSchema>

/**
 * Returns true if any honeypot field (website, hp) is filled with non-empty content after trimming.
 * Checks each field independently so that an empty string in one does not mask content in another.
 * When true, callers should pretend success and store nothing.
 */
export function isHoneypotTriggered(input: Record<string, unknown>): boolean {
  if (!input || typeof input !== "object") {
    return false
  }

  const honeypotKeys = ["website", "hp"]
  for (const key of honeypotKeys) {
    const value = input[key]
    if (typeof value === "string" && value.trim().length > 0) {
      return true
    }
  }

  return false
}
