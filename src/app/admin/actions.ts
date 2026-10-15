"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin, verifyAdmin } from "@/lib/auth"
import { handleDatabaseMutationError, handleLocationError } from "@/lib/errors"
import { locationSchema } from "@/lib/validations/location"

export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  fieldErrors?: Record<string, string[]>
}

export async function loginAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const email = (formData.get("email") as string)?.trim()
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Invalid email or password" }
  }

  const supabase = await createClient()

  let shouldRedirect = false
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user) {
      return { error: "Invalid email or password" }
    }

    const adminCheck = await verifyAdmin(supabase)
    if (!adminCheck.isAdmin) {
      await supabase.auth.signOut()
      return { error: "You are not authorized to access the admin area." }
    }

    shouldRedirect = true
  } catch (err) {
    handleLocationError(err, "[admin] login failed")
    return { error: "Invalid email or password" }
  }

  if (shouldRedirect) {
    redirect("/admin/locations")
  }

  return {}
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/admin/login")
}

export async function createLocationAction(
  rawInput: Record<string, unknown>
): Promise<ActionResult> {
  const { supabase } = await requireAdmin()

  const parseResult = locationSchema.safeParse(rawInput)
  if (!parseResult.success) {
    return {
      success: false,
      fieldErrors: parseResult.error.flatten().fieldErrors,
      error: "Please correct the form errors and try again.",
    }
  }

  const locationData = { ...parseResult.data }
  delete locationData.id

  const { data, error } = await supabase
    .from("locations")
    .insert(locationData as never)
    .select()
    .single()

  if (error) {
    return {
      success: false,
      error: handleDatabaseMutationError(error, "[admin] create location failed"),
    }
  }

  revalidatePath("/")
  revalidatePath("/admin/locations")

  return {
    success: true,
    data,
  }
}

export async function updateLocationAction(
  id: string,
  rawInput: Record<string, unknown>
): Promise<ActionResult> {
  const { supabase } = await requireAdmin()

  const parseResult = locationSchema.safeParse({
    ...rawInput,
    id,
  })

  if (!parseResult.success) {
    return {
      success: false,
      fieldErrors: parseResult.error.flatten().fieldErrors,
      error: "Please correct the form errors and try again.",
    }
  }

  const locationData = { ...parseResult.data }
  delete locationData.id

  const { data, error } = await supabase
    .from("locations")
    .update(locationData as never)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return {
      success: false,
      error: handleDatabaseMutationError(error, "[admin] update location failed"),
    }
  }

  revalidatePath("/")
  revalidatePath("/admin/locations")

  return {
    success: true,
    data,
  }
}

export async function deleteLocationAction(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin()

  const { error } = await supabase.from("locations").delete().eq("id", id)

  if (error) {
    return {
      success: false,
      error: handleDatabaseMutationError(error, "[admin] delete location failed"),
    }
  }

  revalidatePath("/")
  revalidatePath("/admin/locations")

  return {
    success: true,
  }
}
