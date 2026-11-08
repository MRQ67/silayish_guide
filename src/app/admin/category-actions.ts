"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth"
import { categorySchema } from "@/lib/validations/category"
import { uuidSchema } from "@/lib/validations/location"

export interface CategoryActionResult {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
}

export async function saveCategoryAction(
  raw: Record<string, unknown>
): Promise<CategoryActionResult> {
  const { supabase } = await requireAdmin()
  const parsed = categorySchema.safeParse(raw)
  if (!parsed.success)
    return {
      success: false,
      error: "Please correct the form errors and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  const { id, ...values } = parsed.data
  const query = id
    ? await supabase.from("categories").update(values).eq("id", id)
    : await supabase.from("categories").insert(values)
  if (query.error) {
    console.error("[admin] category save failed", query.error)
    return {
      success: false,
      error:
        query.error.code === "23505"
          ? "A category with this name already exists."
          : "Unable to save category.",
    }
  }
  revalidatePath("/")
  revalidatePath("/admin/categories")
  revalidatePath("/admin/locations")
  return { success: true }
}

export async function deleteCategoryAction(
  rawId: string
): Promise<CategoryActionResult> {
  const { supabase } = await requireAdmin()
  const id = uuidSchema.safeParse(rawId)
  if (!id.success) return { success: false, error: "Invalid category ID." }

  const { count, error: countError } = await supabase
    .from("locations")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id.data)
  if (countError)
    return {
      success: false,
      error: "Unable to verify whether this category is in use.",
    }
  if ((count ?? 0) > 0)
    return {
      success: false,
      error:
        "This category is assigned to locations. Reassign those locations before deleting it.",
    }

  const { error } = await supabase.from("categories").delete().eq("id", id.data)
  if (error) {
    console.error("[admin] category delete failed", error)
    return {
      success: false,
      error:
        error.code === "23503"
          ? "This category is assigned to locations. Reassign them before deleting it."
          : "Unable to delete category.",
    }
  }
  revalidatePath("/")
  revalidatePath("/admin/categories")
  revalidatePath("/admin/locations")
  return { success: true }
}
