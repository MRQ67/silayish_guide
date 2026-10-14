import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import type { Location } from "@/lib/types"
import { CampusExplorer } from "@/components/campus-explorer"

function ExplorerLoading() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] w-full flex-col font-sans md:flex-row">
      <div className="flex h-[320px] w-full items-center justify-center bg-muted/20 sm:h-[380px] md:order-2 md:h-full md:flex-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Loading campus map...</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4 md:order-1 md:w-[380px] lg:w-[430px]">
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
        <div className="mt-4 flex flex-col gap-3">
          <div className="h-20 w-full animate-pulse rounded-lg bg-muted/60" />
          <div className="h-20 w-full animate-pulse rounded-lg bg-muted/60" />
          <div className="h-20 w-full animate-pulse rounded-lg bg-muted/60" />
        </div>
      </div>
    </div>
  )
}

async function LocationLoader() {
  let locations: Location[] = []
  let errorMessage: string | null = null

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("locations")
      .select("*, category:categories(id, name, icon)")
      .order("name", { ascending: true })

    if (error) {
      errorMessage = error.message
    } else {
      locations = (data as Location[]) || []
    }
  } catch (err) {
    errorMessage =
      err instanceof Error
        ? err.message
        : "Failed to connect to Supabase server."
  }

  if (errorMessage) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive">
            Unable to load campus locations
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            There was an issue fetching campus data from the database:
          </p>
          <p className="mt-2 rounded border border-destructive/20 bg-background p-2 font-mono text-xs text-destructive">
            {errorMessage}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Please verify your Supabase configuration in your environment
            variables and refresh the page.
          </p>
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
            The database does not contain any campus locations yet. Run the
            database seed script or add locations through the admin portal.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-1 flex-col">
      <CampusExplorer initialLocations={locations} />
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
