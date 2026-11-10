"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth"
import { entranceListSchema } from "@/lib/validations/entrance"
import { uuidSchema } from "@/lib/validations/location"

export interface EntranceActionResult {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
}

export async function saveLocationEntrancesAction(
  rawLocationId: string,
  rawEntrances: unknown
): Promise<EntranceActionResult> {
  const { supabase } = await requireAdmin()
  const locationId = uuidSchema.safeParse(rawLocationId)
  if (!locationId.success)
    return { success: false, error: "Invalid building ID." }

  const parsed = entranceListSchema.safeParse(rawEntrances)
  if (!parsed.success) {
    return {
      success: false,
      error: "Please correct the entrance details and try again.",
      fieldErrors: {
        entrances: parsed.error.issues.map((issue) => issue.message),
      },
    }
  }

  const { data: location, error: locationError } = await supabase
    .from("locations")
    .select("type")
    .eq("id", locationId.data)
    .maybeSingle()
  if (locationError || !location) {
    return { success: false, error: "Unable to find this building." }
  }
  if (location.type !== "building") {
    return {
      success: false,
      error: "Entrances can only be added to buildings.",
    }
  }

  const { error } = await supabase.rpc("replace_location_entrances", {
    p_location_id: locationId.data,
    p_entrances: parsed.data.map((entrance) => ({
      ...entrance,
      accessibility: entrance.accessibility || null,
    })),
  })
  if (error) {
    console.error("[admin] entrance save failed", error)
    return {
      success: false,
      error: "Unable to save building entrances. Please try again.",
    }
  }

  revalidatePath("/")
  revalidatePath(`/admin/locations/${locationId.data}/edit`)
  return { success: true }
}
