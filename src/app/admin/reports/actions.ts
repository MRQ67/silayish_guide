"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth"
import { handleReportError } from "@/lib/errors"
import {
  deleteReportSchema,
  updateReportStatusSchema,
  type FeedbackStatus,
} from "@/lib/validations/report"

export interface AdminActionResult {
  success: boolean
  error?: string
}

export async function updateReportStatusAction(
  id: string,
  status: FeedbackStatus
): Promise<AdminActionResult> {
  const { supabase } = await requireAdmin()

  const parseResult = updateReportStatusSchema.safeParse({ id, status })
  if (!parseResult.success) {
    return {
      success: false,
      error: "Invalid report status or ID.",
    }
  }

  try {
    const { error } = await supabase
      .from("feedback_reports")
      .update({ status: parseResult.data.status } as never)
      .eq("id", parseResult.data.id)

    if (error) {
      const friendlyMessage = handleReportError(
        error,
        "[admin] update report status failed"
      )
      return {
        success: false,
        error: friendlyMessage,
      }
    }

    revalidatePath("/admin/reports")
    return { success: true }
  } catch (err) {
    const friendlyMessage = handleReportError(
      err,
      "[admin] update report status exception"
    )
    return {
      success: false,
      error: friendlyMessage,
    }
  }
}

export async function deleteReportAction(
  id: string
): Promise<AdminActionResult> {
  const { supabase } = await requireAdmin()

  const parseResult = deleteReportSchema.safeParse({ id })
  if (!parseResult.success) {
    return {
      success: false,
      error: "Invalid report ID.",
    }
  }

  try {
    const { error } = await supabase
      .from("feedback_reports")
      .delete()
      .eq("id", parseResult.data.id)

    if (error) {
      const friendlyMessage = handleReportError(
        error,
        "[admin] delete report failed"
      )
      return {
        success: false,
        error: friendlyMessage,
      }
    }

    revalidatePath("/admin/reports")
    return { success: true }
  } catch (err) {
    const friendlyMessage = handleReportError(
      err,
      "[admin] delete report exception"
    )
    return {
      success: false,
      error: friendlyMessage,
    }
  }
}
