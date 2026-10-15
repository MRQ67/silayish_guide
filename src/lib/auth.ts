import { redirect } from "next/navigation"
import type { SupabaseClient, User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { handleLocationError } from "@/lib/errors"
import type { Database } from "@/lib/supabase/database.types"

export interface AdminCheckResult {
  isAdmin: boolean
  user: User | null
  error?: unknown
}

/**
 * Checks whether the current user is an authenticated administrator.
 * Reads the user's own row from public.profiles table.
 */
export async function verifyAdmin(
  supabase: Pick<SupabaseClient<Database>, "auth" | "from">
): Promise<AdminCheckResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { isAdmin: false, user: null }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    return { isAdmin: false, user, error: profileError }
  }

  if (!profile || profile.role !== "admin") {
    return { isAdmin: false, user }
  }

  return { isAdmin: true, user }
}

/**
 * Enforces admin access inside server components and server actions.
 * If unauthenticated or unauthorized, signs out (if signed in) and redirects to /admin/login.
 */
export async function requireAdmin() {
  const supabase = await createClient()
  const result = await verifyAdmin(supabase)

  if (!result.isAdmin) {
    if (result.error) {
      handleLocationError(result.error, "[admin] profile query failed")
    }
    if (result.user) {
      await supabase.auth.signOut()
      redirect("/admin/login?error=not_authorized")
    }
    redirect("/admin/login")
  }

  return { supabase, user: result.user as User }
}
