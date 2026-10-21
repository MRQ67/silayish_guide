"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth"
import {
  DEFAULT_ADMIN_DELETE_REPORT_ERROR_MESSAGE,
  DEFAULT_ADMIN_UPDATE_REPORT_ERROR_MESSAGE,
  handleAdminReportError,
} from "@/lib/errors"
import { checkMutationAffectedRow } from "@/lib/report-utils"
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
    const { data, error } = await supabase
      .from("feedback_reports")
      .update({ status: parseResult.data.status })
      .eq("id", parseResult.data.id)
      .select("id")

    if (error) {
      const friendlyMessage = handleAdminReportError(
        error,
        DEFAULT_ADMIN_UPDATE_REPORT_ERROR_MESSAGE,
        "[admin] update report status failed"
      )
      return {
        success: false,
        error: friendlyMessage,
      }
    }

    const check = checkMutationAffectedRow(data)
    if (!check.affected) {
      revalidatePath("/admin/reports")
      return {
        success: false,
        error: check.message,
      }
    }

    revalidatePath("/admin/reports")
    return { success: true }
  } catch (err) {
    const friendlyMessage = handleAdminReportError(
      err,
      DEFAULT_ADMIN_UPDATE_REPORT_ERROR_MESSAGE,
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
    const { data, error } = await supabase
      .from("feedback_reports")
      .delete()
      .eq("id", parseResult.data.id)
      .select("id")

    if (error) {
      const friendlyMessage = handleAdminReportError(
        error,
        DEFAULT_ADMIN_DELETE_REPORT_ERROR_MESSAGE,
        "[admin] delete report failed"
      )
      return {
        success: false,
        error: friendlyMessage,
      }
    }

    const check = checkMutationAffectedRow(data)
    if (!check.affected) {
      revalidatePath("/admin/reports")
      return {
        success: false,
        error: check.message,
      }
    }

    revalidatePath("/admin/reports")
    return { success: true }
  } catch (err) {
    const friendlyMessage = handleAdminReportError(
      err,
      DEFAULT_ADMIN_DELETE_REPORT_ERROR_MESSAGE,
      "[admin] delete report exception"
    )
    return {
      success: false,
      error: friendlyMessage,
    }
  }
}
