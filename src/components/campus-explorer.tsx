"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { Layers, Search, X } from "lucide-react"

import type { Category, Location } from "@/lib/types"
import { searchLocations } from "@/lib/search"
import { getMapMarkers } from "@/lib/map-utils"
import { LocationListItem } from "@/components/location-list-item"
import { CategoryIcon } from "@/components/category-icon"
import { cn } from "@/lib/utils"

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
  initialCategories?: Category[]
}

export function CampusExplorer({
  initialLocations,
  initialCategories = [],
}: CampusExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  )
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  )

  // Derive categories from initialCategories or unique locations
  const categories = useMemo(() => {
    if (initialCategories && initialCategories.length > 0) {
      return initialCategories
    }
    const map = new Map<string, Category>()
    for (const loc of initialLocations) {
      if (loc.category?.id && !map.has(loc.category.id)) {
        map.set(loc.category.id, loc.category)
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [initialCategories, initialLocations])

  // Compute location count per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const loc of initialLocations) {
      const catId = loc.category_id || loc.category?.id
      if (catId) {
        counts[catId] = (counts[catId] || 0) + 1
      }
    }
    return counts
  }, [initialLocations])

  // Filter locations by selected category and search query
  const filteredLocations = useMemo(() => {
    let result = initialLocations
    if (selectedCategoryId) {
      result = result.filter(
        (l) =>
          l.category_id === selectedCategoryId ||
          l.category?.id === selectedCategoryId
      )
    }
    if (searchQuery.trim()) {
      result = searchLocations(result, searchQuery)
    }
    return result
  }, [initialLocations, selectedCategoryId, searchQuery])

  const mapItemCount = useMemo(() => {
    const outlinesCount = filteredLocations.filter((l) =>
      Boolean(l.outline)
    ).length
    const markersCount = getMapMarkers(
      filteredLocations,
      initialLocations
    ).length
    return outlinesCount + markersCount
  }, [filteredLocations, initialLocations])

  // Scroll the selected location list item into view when selected from the map outline or marker
  useEffect(() => {
    if (!selectedLocation) return
    const el = document.getElementById(`location-item-${selectedLocation.id}`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [selectedLocation])

  const handleSelectLocation = (location: Location) => {
    setSelectedLocation(location)
  }

  const handleClearFilters = () => {
    setSearchQuery("")
    setSelectedCategoryId(null)
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] w-full flex-col font-sans md:flex-row">
      {/* Map Section: On mobile fixed height at top; on desktop flex-1 on right */}
      <section
        aria-label="Campus Map"
        className="relative h-[320px] w-full shrink-0 border-b border-border sm:h-[380px] md:order-2 md:h-full md:flex-1 md:border-b-0 md:border-l"
      >
        <CampusMap
          locations={filteredLocations}
          allLocations={initialLocations}
          selectedLocation={selectedLocation}
          onSelectLocation={handleSelectLocation}
        />
      </section>

      {/* List and Search Sidebar: On mobile scrollable list below map; on desktop sidebar on left */}
      <section
        aria-label="Campus Locations"
        className="flex flex-1 flex-col overflow-hidden bg-background md:order-1 md:w-[380px] md:shrink-0 lg:w-[430px]"
      >
        {/* Search & Category Filter Header */}
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

          {/* Category Filter Chips Bar */}
          {categories.length > 0 && (
            <div
              role="region"
              aria-label="Filter locations by category"
              className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none"
            >
              <button
                type="button"
                data-testid="category-chip-all"
                onClick={() => setSelectedCategoryId(null)}
                aria-pressed={selectedCategoryId === null}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selectedCategoryId === null
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Layers className="h-3 w-3" />
                <span>All</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px]",
                    selectedCategoryId === null
                      ? "bg-primary-foreground/25 text-primary-foreground"
                      : "bg-background/80 text-muted-foreground"
                  )}
                >
                  {initialLocations.length}
                </span>
              </button>

              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id
                const count = categoryCounts[cat.id] ?? 0
                return (
                  <button
                    key={cat.id}
                    type="button"
                    data-testid={`category-chip-${cat.id}`}
                    onClick={() =>
                      setSelectedCategoryId((prev) =>
                        prev === cat.id ? null : cat.id
                      )
                    }
                    aria-pressed={isSelected}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <CategoryIcon iconName={cat.icon} className="h-3 w-3" />
                    <span>{cat.name}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.2 text-[10px]",
                        isSelected
                          ? "bg-primary-foreground/25 text-primary-foreground"
                          : "bg-background/80 text-muted-foreground"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {filteredLocations.length === 1
                ? "1 location found"
                : `${filteredLocations.length} locations found`}
            </span>
            {mapItemCount > 0 && (
              <span>
                {mapItemCount === 1 ? "1 on map" : `${mapItemCount} on map`}
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
                {selectedCategoryId
                  ? "No campus location matched the selected category and search query."
                  : `No campus location matched "${searchQuery}". Try searching for another building name or code like B-002.`}
              </p>
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-3 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Clear filters and search
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
