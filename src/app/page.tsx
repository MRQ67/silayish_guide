import { Suspense } from "react"
import { unstable_rethrow } from "next/navigation"
import { connection } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type {
  Category,
  Location,
  PedestrianPath,
  Service,
} from "@/lib/types"
import { handleLocationError } from "@/lib/errors"
import { CampusExplorer } from "@/components/campus-explorer"

function ExplorerLoading() {
  return (
    <div className="relative flex h-dvh w-full flex-col font-sans md:flex-row overflow-hidden">
      <div className="absolute inset-0 flex w-full h-full items-center justify-center bg-muted/20 md:relative md:order-2 md:flex-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Loading campus map...</span>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 h-[50dvh] rounded-t-[28px] border-t border-border/80 bg-background/95 p-4 shadow-xl md:static md:h-full md:w-[400px] lg:w-[440px] md:rounded-none md:border-t-0 md:border-r">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-muted md:hidden mb-4" />
        <div className="h-10 w-full animate-pulse rounded-full bg-muted" />
        <div className="mt-4 flex flex-col gap-3">
          <div className="h-24 w-full animate-pulse rounded-2xl bg-muted/60" />
          <div className="h-16 w-full animate-pulse rounded-2xl bg-muted/60" />
          <div className="h-16 w-full animate-pulse rounded-2xl bg-muted/60" />
        </div>
      </div>
    </div>
  )
}

function isMissingCategoryColorColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") return false

  const value = error as {
    code?: unknown
    message?: unknown
    details?: unknown
  }
  const text = [value.message, value.details]
    .filter((part): part is string => typeof part === "string")
    .join(" ")

  return (
    (value.code === "42703" || value.code === "PGRST204") &&
    /categories?/i.test(text) &&
    /\bcolor\b/i.test(text)
  ) ||
    (/categories?/i.test(text) &&
      /\bcolor\b/i.test(text) &&
      /(does not exist|schema cache|not found|could not find)/i.test(text))
}

async function LocationLoader() {
  await connection()
  let locations: Location[] = []
  let categories: Category[] = []
  let services: Service[] = []
  let pedestrianPaths: PedestrianPath[] = []
  let errorMessage: string | null = null

  try {
    const supabase = await createClient()
    const [locationsRes, categoriesRes, servicesRes, pathsRes] =
      await Promise.all([
        supabase
          .from("locations")
          .select("*, category:categories(id, name, icon, color)")
          .order("name", { ascending: true }),
        supabase
          .from("categories")
          .select("id, name, icon, color")
          .order("name", { ascending: true }),
        supabase
          .from("services")
          .select("*, location:locations(id, name, code)")
          .order("name", { ascending: true }),
        supabase
          .from("pedestrian_paths")
          .select("*")
          .eq("is_active", true)
          .order("name", { ascending: true }),
      ])

    let locationsData = locationsRes.data
    let locationsError = locationsRes.error
    if (isMissingCategoryColorColumn(locationsError)) {
      const fallbackLocations = await supabase
        .from("locations")
        .select("*, category:categories(id, name, icon)")
        .order("name", { ascending: true })
      locationsData = fallbackLocations.data as typeof locationsData
      locationsError = fallbackLocations.error
    }

    let categoriesData = categoriesRes.data
    let categoriesError = categoriesRes.error
    if (isMissingCategoryColorColumn(categoriesError)) {
      const fallbackCategories = await supabase
        .from("categories")
        .select("id, name, icon")
        .order("name", { ascending: true })
      categoriesData = fallbackCategories.data as typeof categoriesData
      categoriesError = fallbackCategories.error
    }

    if (locationsError) {
      errorMessage = handleLocationError(locationsError)
    } else {
      locations = (locationsData as Location[]) || []
    }

    if (categoriesError) {
      console.error("[categories] fetch error:", categoriesError)
    } else if (categoriesData) {
      categories = (categoriesData as Category[]) || []
    }

    if (servicesRes.error) {
      console.error("[services] fetch error:", servicesRes.error)
    } else if (servicesRes.data) {
      services = (servicesRes.data as Service[]) || []
    }

    if (pathsRes.error) {
      console.error("[pedestrian paths] fetch error:", pathsRes.error)
    } else if (pathsRes.data) {
      pedestrianPaths = (pathsRes.data as unknown as PedestrianPath[]) || []
    }
  } catch (err) {
    unstable_rethrow(err)
    errorMessage = handleLocationError(err)
  }

  if (errorMessage) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive">
            Unable to load campus locations
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
        </div>
      </main>
    )
  }

  if (locations.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-xs">
          <h2 className="text-lg font-semibold text-foreground">
            No campus locations available
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            There are currently no locations listed in the campus guide.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-1 flex-col">
      <CampusExplorer
        initialLocations={locations}
        initialCategories={categories}
        initialServices={services}
        initialPedestrianPaths={pedestrianPaths}
      />
    </main>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<ExplorerLoading />}>
      <LocationLoader />
    </Suspense>
  )
}
