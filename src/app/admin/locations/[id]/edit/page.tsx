import Link from "next/link"
import { notFound } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { handleLocationError } from "@/lib/errors"
import { isValidUuid } from "@/lib/validations/location"
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

  // 1. Validate that the [id] param is a valid UUID before querying.
  if (!isValidUuid(id)) {
    notFound()
  }

  const { supabase, user } = await requireAdmin()

  let locationResult
  let categoriesResult
  let buildingsResult

  try {
    ;[locationResult, categoriesResult, buildingsResult] = await Promise.all([
      supabase.from("locations").select("*").eq("id", id).maybeSingle(),
      supabase.from("categories").select("id, name, icon").order("name"),
      supabase
        .from("locations")
        .select("id, name, code")
        .eq("type", "building")
        .order("name"),
    ])
  } catch (err) {
    const errorMessage = handleLocationError(
      err,
      "[admin] location edit load failed"
    )
    return (
      <div className="min-h-screen bg-background font-sans">
        <AdminHeader userEmail={user.email} />
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          >
            {errorMessage}
          </div>
        </main>
      </div>
    )
  }

  // 2. Check query error. If there is an error, log it and show generic error UI.
  // Never call notFound() for a failed query.
  if (locationResult.error) {
    const errorMessage = handleLocationError(
      locationResult.error,
      "[admin] location edit query failed"
    )
    return (
      <div className="min-h-screen bg-background font-sans">
        <AdminHeader userEmail={user.email} />
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          >
            {errorMessage}
          </div>
        </main>
      </div>
    )
  }

  // 3. Call notFound() only when query succeeded and returned no row.
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
