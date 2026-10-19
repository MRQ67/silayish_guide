"use server"

import { createClient } from "@/lib/supabase/server"
import { handleReportError } from "@/lib/errors"
import { isHoneypotTriggered, submitReportSchema } from "@/lib/validations/report"

export interface SubmitReportResult {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
}

export async function submitReportAction(
  rawInput: Record<string, unknown> | FormData
): Promise<SubmitReportResult> {
  const inputObject: Record<string, unknown> =
    rawInput instanceof FormData
      ? Object.fromEntries(rawInput.entries())
      : rawInput

  // If the honeypot field was filled by a bot, pretend success and store nothing
  if (isHoneypotTriggered(inputObject)) {
    return { success: true }
  }

  const parseResult = submitReportSchema.safeParse(inputObject)
  if (!parseResult.success) {
    return {
      success: false,
      fieldErrors: parseResult.error.flatten().fieldErrors,
      error: "Please correct the form errors and try again.",
    }
  }

  const { location_id, message } = parseResult.data

  try {
    const supabase = await createClient()

    // Public (anon) role can insert with status = 'open'
    // Do NOT chain .select() because visitors cannot read reports and it would fail with RLS
    const { error } = await supabase.from("feedback_reports").insert({
      location_id,
      message,
      status: "open",
    } as never)

    if (error) {
      const friendlyMessage = handleReportError(error, "[reports] insert failed")
      return {
        success: false,
        error: friendlyMessage,
      }
    }

    return { success: true }
  } catch (err) {
    const friendlyMessage = handleReportError(err, "[reports] insert exception")
    return {
      success: false,
      error: friendlyMessage,
    }
  }
}
