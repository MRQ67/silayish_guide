"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import {
  Bookmark,
  Layers,
  Map as MapIcon,
  MapPin,
  Mic,
  Navigation,
  Search,
  Sparkles,
  SplitSquareVertical,
  X,
} from "lucide-react"

import type { Category, Location, Service } from "@/lib/types"
import { normalizeCode, searchLocations } from "@/lib/search"
import { getMapMarkers } from "@/lib/map-utils"
import { getLocationDistanceMeters } from "@/lib/location-utils"
import { useBookmarks } from "@/lib/use-bookmarks"
import { LocationListItem } from "@/components/location-list-item"
import { LocationDetailPanel } from "@/components/location-detail-panel"
import { ServicesList } from "@/components/services-list"
import { CategoryIcon } from "@/components/category-icon"
import { useLanguage } from "@/components/language-provider"
import { getLocalizedCategoryName, translations } from "@/lib/i18n"
import type { Locale, TranslationDictionary } from "@/lib/i18n"
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
  initialServices?: Service[]
}

export function CampusExplorer({
  initialLocations,
  initialCategories = [],
  initialServices = [],
}: CampusExplorerProps) {
  let locale: Locale = "en"
  let t: TranslationDictionary = translations.en

  try {
    const langCtx = useLanguage()
    locale = langCtx.locale
    t = langCtx.t
  } catch {
    // outside provider in unit tests
  }

  const { bookmarks, isBookmarked, toggleBookmark } = useBookmarks()

  const [activeTab, setActiveTab] = useState<"locations" | "services" | "saved">("locations")
  const [mobileView, setMobileView] = useState<"split" | "map" | "list">("split")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [sortByNearest, setSortByNearest] = useState(false)
  const [isRoutingActive, setIsRoutingActive] = useState(false)
  const [isListeningVoice, setIsListeningVoice] = useState(false)

  // Initialize selectedLocation to null to prevent SSR hydration mismatch, then sync on mount
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)

  // Sync selectedLocation from URL on client mount and history change
  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search)
      const locationParam = params.get("location")
      if (!locationParam) {
        setSelectedLocation(null)
        setIsRoutingActive(false)
        return
      }

      const normalizedParam = normalizeCode(locationParam)
      const match = initialLocations.find(
        (loc) =>
          (loc.code && normalizeCode(loc.code) === normalizedParam) ||
          loc.id === locationParam
      )
      setSelectedLocation(match || null)
    }

    syncFromUrl()
    window.addEventListener("popstate", syncFromUrl)
    return () => window.removeEventListener("popstate", syncFromUrl)
  }, [initialLocations])

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

  // Precompute distances between user location and all campus locations in O(N)
  const distanceMap = useMemo(() => {
    if (!userLocation) return new Map<string, number>()
    const map = new Map<string, number>()
    for (const loc of initialLocations) {
      const dist = getLocationDistanceMeters(
        loc,
        userLocation,
        initialLocations
      )
      if (dist != null) {
        map.set(loc.id, dist)
      }
    }
    return map
  }, [userLocation, initialLocations])

  // Sort filtered locations deterministically by distance (with alphabetical fallback on tie or Infinity)
  const displayLocations = useMemo(() => {
    if (!userLocation || !sortByNearest) {
      return filteredLocations
    }
    return [...filteredLocations].sort((a, b) => {
      const distA = distanceMap.get(a.id) ?? Infinity
      const distB = distanceMap.get(b.id) ?? Infinity
      if (distA === distB) {
        return a.name.localeCompare(b.name)
      }
      return distA - distB
    })
  }, [filteredLocations, userLocation, sortByNearest, distanceMap])

  // Saved locations list
  const savedLocations = useMemo(() => {
    const set = new Set(bookmarks)
    const list = initialLocations.filter((l) => set.has(l.id))
    if (userLocation && sortByNearest) {
      return [...list].sort((a, b) => {
        const distA = distanceMap.get(a.id) ?? Infinity
        const distB = distanceMap.get(b.id) ?? Infinity
        if (distA === distB) {
          return a.name.localeCompare(b.name)
        }
        return distA - distB
      })
    }
    return list
  }, [initialLocations, bookmarks, userLocation, sortByNearest, distanceMap])

  const mapItemCount = useMemo(() => {
    const outlinesCount = filteredLocations.filter((l) => Boolean(l.outline)).length
    const markersCount = getMapMarkers(filteredLocations, initialLocations).length
    return outlinesCount + markersCount
  }, [filteredLocations, initialLocations])

  const lastSelectedIdRef = useRef<string | null>(null)

  // When selectedLocation becomes null, restore focus and scroll to the item
  useEffect(() => {
    if (!selectedLocation && lastSelectedIdRef.current) {
      const el = document.getElementById(
        `location-item-${lastSelectedIdRef.current}`
      )
      if (el) {
        if (typeof el.scrollIntoView === "function") {
          el.scrollIntoView({ behavior: "smooth", block: "nearest" })
        }
        if (typeof el.focus === "function") {
          el.focus()
        }
      }
    }
  }, [selectedLocation])

  const handleSelectLocation = useCallback((location: Location) => {
    lastSelectedIdRef.current = location.id
    setSelectedLocation(location)
    if (mobileView === "list") {
      setMobileView("map")
    }
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      const param = location.code || location.id
      url.searchParams.set("location", param)
      window.history.replaceState({}, "", url.toString())
    }
  }, [mobileView])

  // Memoized to prevent focus stealing in LocationDetailPanel
  const handleDeselectLocation = useCallback(() => {
    setSelectedLocation(null)
    setIsRoutingActive(false)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.delete("location")
      window.history.replaceState({}, "", url.toString())
    }
  }, [])

  const handleClearFilters = useCallback(() => {
    setSearchQuery("")
    setSelectedCategoryId(null)
    handleDeselectLocation()
  }, [handleDeselectLocation])

  const handleStartDirections = useCallback(() => {
    if (isRoutingActive) {
      setIsRoutingActive(false)
      return
    }
    setIsRoutingActive(true)
    if (mobileView === "list") {
      setMobileView("split")
    }
    if (!userLocation && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude])
        },
        () => {
          // ignore or fallback
        },
        { enableHighAccuracy: true, timeout: 8000 }
      )
    }
  }, [isRoutingActive, mobileView, userLocation])

  // Manage Web Speech API instance and prevent resource leaks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore
        }
      }
    }
  }, [])

  const handleVoiceSearch = () => {
    if (typeof window === "undefined") return

    // If already active, abort on toggle
    if (isListeningVoice && recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch {
        // ignore
      }
      setIsListeningVoice(false)
      return
    }

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .webkitSpeechRecognition

    if (!SpeechRecognition) {
      return
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition = new (SpeechRecognition as any)()
      recognition.lang = locale === "am" ? "am-ET" : "en-US"
      recognition.interimResults = false
      recognition.maxAlternatives = 1
      recognitionRef.current = recognition

      setIsListeningVoice(true)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript
        if (transcript) {
          setSearchQuery(transcript)
        }
        setIsListeningVoice(false)
      }

      recognition.onerror = () => {
        setIsListeningVoice(false)
      }

      recognition.onend = () => {
        setIsListeningVoice(false)
      }

      recognition.start()
    } catch {
      setIsListeningVoice(false)
    }
  }

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem)] w-full flex-col font-sans md:flex-row overflow-hidden">
      {/* Map Section */}
      <section
        aria-label="Campus Map"
        className={cn(
          "relative w-full shrink-0 border-b border-border transition-all md:order-2 md:h-full md:flex-1 md:border-b-0 md:border-l",
          mobileView === "map"
            ? "h-full flex-1"
            : mobileView === "list"
              ? "hidden md:flex md:h-full"
              : "h-[320px] sm:h-[380px]"
        )}
      >
        <CampusMap
          locations={filteredLocations}
          allLocations={initialLocations}
          selectedLocation={selectedLocation}
          userLocation={userLocation}
          isRoutingActive={isRoutingActive}
          onSelectLocation={handleSelectLocation}
          onUserLocationChange={setUserLocation}
          onToggleRouting={setIsRoutingActive}
        />
      </section>

      {/* List / Details Sidebar */}
      <section
        aria-label="Campus Directory"
        className={cn(
          "flex flex-1 flex-col overflow-hidden bg-background md:order-1 md:w-[380px] md:shrink-0 lg:w-[430px]",
          mobileView === "map" ? "hidden md:flex" : "flex h-full"
        )}
      >
        {/* Navigation Tabs: Locations, Campus Services, Saved Places (Mockup Dock style) */}
        <div className="flex items-center border-b border-border bg-card/60 px-3 py-1.5 text-xs font-medium">
          <div
            role="tablist"
            aria-label="Campus Directory sections"
            className="flex w-full items-center rounded-lg bg-muted/60 p-0.5"
          >
            <button
              type="button"
              role="tab"
              id="tab-locations"
              aria-selected={activeTab === "locations"}
              aria-controls="panel-locations"
              data-testid="tab-locations"
              onClick={() => setActiveTab("locations")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeTab === "locations"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t.placesTab} ({initialLocations.length})</span>
            </button>
            <button
              type="button"
              role="tab"
              id="tab-services"
              aria-selected={activeTab === "services"}
              aria-controls="panel-services"
              data-testid="tab-services"
              onClick={() => {
                setActiveTab("services")
                handleDeselectLocation()
              }}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeTab === "services"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t.servicesTab} {initialServices.length > 0 && `(${initialServices.length})`}</span>
            </button>
            <button
              type="button"
              role="tab"
              id="tab-saved"
              aria-selected={activeTab === "saved"}
              aria-controls="panel-saved"
              data-testid="tab-saved"
              onClick={() => {
                setActiveTab("saved")
                handleDeselectLocation()
              }}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeTab === "saved"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t.savedTab} {bookmarks.length > 0 && `(${bookmarks.length})`}</span>
            </button>
          </div>
        </div>

        {/* Tab Content: Services */}
        {activeTab === "services" ? (
          <div
            id="panel-services"
            role="tabpanel"
            aria-labelledby="tab-services"
            className="flex flex-1 flex-col overflow-hidden"
          >
            <ServicesList
              services={initialServices}
              allLocations={initialLocations}
              onSelectLocation={handleSelectLocation}
            />
          </div>
        ) : activeTab === "saved" ? (
          /* Tab Content: Saved Places */
          <div
            id="panel-saved"
            role="tabpanel"
            aria-labelledby="tab-saved"
            className="flex flex-1 flex-col overflow-hidden"
          >
            {selectedLocation ? (
              <LocationDetailPanel
                location={selectedLocation}
                allLocations={initialLocations}
                onBack={handleDeselectLocation}
                onSelectLocation={handleSelectLocation}
                distanceMeters={distanceMap.get(selectedLocation.id) ?? null}
                onStartDirections={handleStartDirections}
                isRoutingActive={isRoutingActive}
                isBookmarked={isBookmarked(selectedLocation.id)}
                onToggleBookmark={toggleBookmark}
              />
            ) : savedLocations.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-3">
                  <Bookmark className="h-6 w-6" />
                </div>
                <p className="font-semibold text-foreground text-sm">
                  {t.savedEmptyTitle}
                </p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  {t.savedEmptyDesc}
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                <div className="mb-2 text-xs font-semibold text-muted-foreground">
                  {savedLocations.length}{" "}
                  {savedLocations.length === 1
                    ? t.locationCountSingular
                    : t.locationCountPlural}
                </div>
                <div className="flex flex-col gap-2.5">
                  {savedLocations.map((loc) => (
                    <LocationListItem
                      key={loc.id}
                      location={loc}
                      onClick={handleSelectLocation}
                      distanceMeters={distanceMap.get(loc.id) ?? null}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Tab Content: Locations */
          <div
            id="panel-locations"
            role="tabpanel"
            aria-labelledby="tab-locations"
            className="flex flex-1 flex-col overflow-hidden"
          >
            {selectedLocation ? (
              /* When a location is selected, display Rich Detail Panel */
              <LocationDetailPanel
                location={selectedLocation}
                allLocations={initialLocations}
                onBack={handleDeselectLocation}
                onSelectLocation={handleSelectLocation}
                distanceMeters={distanceMap.get(selectedLocation.id) ?? null}
                onStartDirections={handleStartDirections}
                isRoutingActive={isRoutingActive}
                isBookmarked={isBookmarked(selectedLocation.id)}
                onToggleBookmark={toggleBookmark}
              />
            ) : (
              /* Locations Tab: Search + Categories + List */
              <>
                <div className="border-b border-border p-3 sm:p-4">
                  <div className="relative flex items-center">
                    <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.searchPlaceholder}
                      className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-16 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <div className="absolute right-2 flex items-center gap-1">
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          aria-label={t.clearSearch}
                          className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleVoiceSearch}
                        aria-label="Voice search"
                        title="Voice search"
                        className={cn(
                          "rounded-full p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isListeningVoice
                            ? "bg-rose-500/20 text-rose-600 animate-pulse"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Mic className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Category Filter Chips Bar (Mockup Style with All, Academics, Admin, Health) */}
                  <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
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
                      <span>{t.allCategories}</span>
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

                    {/* Nearby Sort Chip (visible when user location is available) */}
                    {userLocation && (
                      <button
                        type="button"
                        data-testid="nearby-sort-toggle"
                        onClick={() => setSortByNearest((prev) => !prev)}
                        aria-pressed={sortByNearest}
                        className={cn(
                          "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          sortByNearest
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-100"
                        )}
                      >
                        <Navigation className="h-3 w-3" aria-hidden="true" />
                        <span>{t.nearby}</span>
                      </button>
                    )}

                    {categories.map((cat) => {
                      const isSelected = selectedCategoryId === cat.id
                      const count = categoryCounts[cat.id] ?? 0
                      const localizedName = getLocalizedCategoryName(
                        cat.name,
                        locale
                      )

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
                          <span>{localizedName}</span>
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.2 text-[10px]",
                              isSelected
                                ? "bg-primary-foreground/25 text-primary-foreground"
                                : "bg-muted-foreground/15 text-muted-foreground"
                            )}
                          >
                            {count}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Subheader: Item Count and Map status */}
                <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1 font-medium">
                    <span>
                      {displayLocations.length}{" "}
                      {displayLocations.length === 1
                        ? t.locationCountSingular
                        : t.locationCountPlural}
                    </span>
                    {userLocation && sortByNearest && (
                      <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                        · {t.closest}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    {mapItemCount > 0 && (
                      <span>
                        {mapItemCount === 1 ? `1 ${t.onMap}` : `${mapItemCount} ${t.onMap}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Locations List */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                  {displayLocations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <p className="font-semibold text-foreground">
                        {t.noLocationsFound}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedCategoryId
                          ? t.noLocationsHint
                          : `${t.noLocationsFound}. ${t.noLocationsHint}`}
                      </p>
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="mt-3 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {t.clearFilters}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {displayLocations.map((location) => {
                        const distanceMeters =
                          distanceMap.get(location.id) ?? null

                        return (
                          <LocationListItem
                            key={location.id}
                            location={location}
                            onClick={handleSelectLocation}
                            distanceMeters={distanceMeters}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {/* Mobile Floating View Switcher (Map / Split / List) */}
      <div
        role="group"
        aria-label="View layout"
        className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-[500] flex items-center rounded-full border border-border bg-card/95 px-1 py-0.5 shadow-lg backdrop-blur"
      >
        <button
          type="button"
          onClick={() => setMobileView("map")}
          aria-pressed={mobileView === "map"}
          data-testid="mobile-view-map"
          className={cn(
            "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
            mobileView === "map"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t.viewMap}</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView("split")}
          aria-pressed={mobileView === "split"}
          data-testid="mobile-view-split"
          className={cn(
            "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
            mobileView === "split"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <SplitSquareVertical className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t.viewSplit}</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView("list")}
          aria-pressed={mobileView === "list"}
          data-testid="mobile-view-list"
          className={cn(
            "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
            mobileView === "list"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t.viewList}</span>
        </button>
      </div>
    </div>
  )
}
