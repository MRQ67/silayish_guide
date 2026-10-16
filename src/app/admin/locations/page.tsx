import { connection } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { handleLocationError } from "@/lib/errors"
import { attachParentNames } from "@/lib/location-utils"
import type { Location } from "@/lib/types"
import { AdminHeader } from "@/components/admin/admin-header"
import {
  LocationsTable,
  type AdminLocationItem,
} from "@/components/admin/locations-table"

export const instant = false

export default async function AdminLocationsPage() {
  await connection()
  const { supabase, user } = await requireAdmin()

  let locations: AdminLocationItem[] = []
  let errorMessage: string | null = null

  try {
    const { data, error } = await supabase
      .from("locations")
      .select(`
        *,
        category:categories(id, name, icon)
      `)
      .order("name", { ascending: true })

    if (error) {
      errorMessage = handleLocationError(error, "[admin] locations fetch failed")
    } else {
      const rawLocations = (data as unknown as Location[]) || []
      locations = attachParentNames(rawLocations)
    }
  } catch (err) {
    errorMessage = handleLocationError(err, "[admin] locations load exception")
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <AdminHeader userEmail={user.email} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Campus Locations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage campus buildings, offices, labs, and facilities.
          </p>
        </div>

        {errorMessage ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          >
            {errorMessage}
          </div>
        ) : (
          <LocationsTable initialLocations={locations} />
        )}
      </main>
    </div>
  )
}
