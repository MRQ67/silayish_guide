import { connection } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { handleLocationError } from "@/lib/errors"
import type { Category } from "@/lib/types"
import { AdminHeader } from "@/components/admin/admin-header"
import { CategoryManager } from "@/components/admin/category-manager"

export const instant = false

export default async function AdminCategoriesPage() {
  await connection()
  const { supabase, user } = await requireAdmin()
  const [categoriesResult, locationsResult] = await Promise.all([
    supabase.from("categories").select("id, name, icon, color").order("name"),
    supabase.from("locations").select("category_id"),
  ])
  const error = categoriesResult.error || locationsResult.error
  const categories = (categoriesResult.data as Category[] | null) ?? []
  const usage: Record<string, number> = {}
  for (const location of locationsResult.data ?? []) {
    if (location.category_id)
      usage[location.category_id] = (usage[location.category_id] ?? 0) + 1
  }
  return (
    <div className="min-h-screen bg-background font-sans">
      <AdminHeader userEmail={user.email} activeSection="categories" />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage category names, icons, and map colors.
          </p>
        </div>
        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          >
            {handleLocationError(error, "[admin] categories load failed")}
          </div>
        ) : (
          <CategoryManager categories={categories} usage={usage} />
        )}
      </main>
    </div>
  )
}
