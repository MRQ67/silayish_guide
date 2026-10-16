import Link from "next/link"
import { connection } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { AdminHeader } from "@/components/admin/admin-header"
import {
  LocationForm,
  type ParentBuildingOption,
} from "@/components/admin/location-form"
import type { Category } from "@/lib/types"

export const instant = false

export default async function NewLocationPage() {
  await connection()
  const { supabase, user } = await requireAdmin()

  const [categoriesResult, buildingsResult] = await Promise.all([
    supabase.from("categories").select("id, name, icon").order("name"),
    supabase
      .from("locations")
      .select("id, name, code")
      .eq("type", "building")
      .order("name"),
  ])

  const categories = (categoriesResult.data as Category[]) || []
  const buildings = (buildingsResult.data as ParentBuildingOption[]) || []

  return (
    <div className="min-h-screen bg-background font-sans">
      <AdminHeader userEmail={user.email} />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link href="/admin/locations" className="hover:underline">
                Locations
              </Link>
              <span>/</span>
              <span>New</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              Add New Location
            </h1>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-xs sm:p-8">
          <LocationForm categories={categories} buildings={buildings} />
        </div>
      </main>
    </div>
  )
}
