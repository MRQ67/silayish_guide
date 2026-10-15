import Link from "next/link"
import { notFound } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { AdminHeader } from "@/components/admin/admin-header"
import {
  LocationForm,
  type ParentBuildingOption,
} from "@/components/admin/location-form"
import type { Category, Location } from "@/lib/types"

interface EditLocationPageProps {
  params: Promise<{ id: string }>
}

export default async function EditLocationPage({
  params,
}: EditLocationPageProps) {
  const { id } = await params
  const { supabase, user } = await requireAdmin()

  const [locationResult, categoriesResult, buildingsResult] =
    await Promise.all([
      supabase.from("locations").select("*").eq("id", id).maybeSingle(),
      supabase.from("categories").select("id, name, icon").order("name"),
      supabase
        .from("locations")
        .select("id, name, code")
        .eq("type", "building")
        .order("name"),
    ])

  if (!locationResult.data) {
    notFound()
  }

  const location = locationResult.data as Location
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
              <span>Edit</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              Edit Location: {location.name}
            </h1>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-xs sm:p-8">
          <LocationForm
            initialData={location}
            categories={categories}
            buildings={buildings}
          />
        </div>
      </main>
    </div>
  )
}
