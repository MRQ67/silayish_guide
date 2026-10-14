"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { Search, X } from "lucide-react"

import type { Location } from "@/lib/types"
import { searchLocations } from "@/lib/search"
import { getMapMarkers } from "@/lib/map-utils"
import { LocationListItem } from "@/components/location-list-item"

const CampusMap = dynamic(() => import("@/components/campus-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted/20 font-sans text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span>Loading campus map...</span>
      </div>
    </div>
  ),
})

export interface CampusExplorerProps {
  initialLocations: Location[]
}

export function CampusExplorer({ initialLocations }: CampusExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  )

  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) {
      return initialLocations
    }
    return searchLocations(initialLocations, searchQuery)
  }, [initialLocations, searchQuery])

  const markers = useMemo(() => {
    return getMapMarkers(filteredLocations)
  }, [filteredLocations])

  const handleSelectLocation = (location: Location) => {
    setSelectedLocation(location)
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] w-full flex-col font-sans md:flex-row">
      {/* Map Section: On mobile fixed height at top; on desktop flex-1 on right */}
      <section
        aria-label="Campus Map"
        className="relative h-[320px] w-full shrink-0 border-b border-border sm:h-[380px] md:order-2 md:h-full md:flex-1 md:border-b-0 md:border-l"
      >
        <CampusMap
          markers={markers}
          selectedLocation={selectedLocation}
          onSelectLocation={handleSelectLocation}
        />
      </section>

      {/* List and Search Sidebar: On mobile scrollable list below map; on desktop sidebar on left */}
      <section
        aria-label="Campus Locations"
        className="flex flex-1 flex-col overflow-hidden bg-background md:order-1 md:w-[380px] md:shrink-0 lg:w-[430px]"
      >
        {/* Search Header */}
        <div className="border-b border-border p-3 sm:p-4">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, description, or code (e.g. B-002)..."
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {filteredLocations.length === 1
                ? "1 location found"
                : `${filteredLocations.length} locations found`}
            </span>
            {markers.length > 0 && (
              <span>
                {markers.length === 1 ? "1 on map" : `${markers.length} on map`}
              </span>
            )}
          </div>
        </div>

        {/* Locations List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {filteredLocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="font-semibold text-foreground">
                No locations found
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                No campus location matched &ldquo;{searchQuery}&rdquo;. Try
                searching for another building name or code like B-002.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-3 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Clear search query
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filteredLocations.map((location) => {
                const isSelected = selectedLocation?.id === location.id
                return (
                  <LocationListItem
                    key={location.id}
                    location={location}
                    onClick={handleSelectLocation}
                    className={
                      isSelected
                        ? "border-primary/60 bg-muted/40 ring-1 ring-primary/40"
                        : ""
                    }
                  />
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
