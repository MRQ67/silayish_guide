"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import {
  ArrowUpDown,
  Bookmark,
  Compass,
  Layers,
  MapPin,
  Mic,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react"
import Link from "next/link"

import type { Category, Location, Service } from "@/lib/types"
import { normalizeCode, searchLocations } from "@/lib/search"
import { getMapMarkers } from "@/lib/map-utils"
import { getLocationDistanceMeters } from "@/lib/location-utils"
import { useBookmarks } from "@/lib/use-bookmarks"
import { LocationListItem } from "@/components/location-list-item"
import { LocationDetailPanel } from "@/components/location-detail-panel"
import { FeaturedLocationCard } from "@/components/featured-location-card"
import { ServicesList } from "@/components/services-list"
import { CategoryIcon } from "@/components/category-icon"
import { useLanguage } from "@/components/language-provider"
import { getLocalizedCategoryName, translations } from "@/lib/i18n"
import type { Locale, TranslationDictionary } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { resolveCategoryStyle } from "@/lib/category-style"
import { LanguageToggle } from "@/components/language-toggle"
import { ThemeToggle } from "@/components/theme-toggle"

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

export type SheetSnap = "peek" | "half" | "full"

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

  const [activeTab, setActiveTab] = useState<
    "locations" | "services" | "saved"
  >("locations")
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>("half")
  const [showFullDetails, setShowFullDetails] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  )
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  )
  const [sortByNearest, setSortByNearest] = useState(false)
  const [isRoutingActive, setIsRoutingActive] = useState(false)
  const [isListeningVoice, setIsListeningVoice] = useState(false)

  // Touch tracking exclusively on the sheet handle container (prevents hijacking list scrolling)
  const touchStartYRef = useRef<number | null>(null)
  const touchCurrentYRef = useRef<number | null>(null)

  // Initialize selectedLocation to null to prevent SSR hydration mismatch, then sync on mount
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  )

  // Sync selectedLocation from URL on client mount and history change
  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search)
      const locationParam = params.get("location")
      if (!locationParam) {
        setSelectedLocation(null)
        setIsRoutingActive(false)
        setShowFullDetails(false)
        return
      }

      const normalizedParam = normalizeCode(locationParam)
      const match = initialLocations.find(
        (loc) =>
          (loc.code && normalizeCode(loc.code) === normalizedParam) ||
          loc.id === locationParam
      )
      if (match) {
        setSelectedLocation(match)
        setSheetSnap((prev) => (prev === "peek" ? "half" : prev))
      } else {
        setSelectedLocation(null)
      }
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
    const outlinesCount = filteredLocations.filter((l) =>
      Boolean(l.outline)
    ).length
    const markersCount = getMapMarkers(
      filteredLocations,
      initialLocations
    ).length
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
    setShowFullDetails(false)
    setSheetSnap((prev) => (prev === "peek" ? "half" : prev))
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      const param = location.code || location.id
      url.searchParams.set("location", param)
      window.history.replaceState({}, "", url.toString())
    }
  }, [])

  const handleDeselectLocation = useCallback(() => {
    setSelectedLocation(null)
    setIsRoutingActive(false)
    setShowFullDetails(false)
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
    setSheetSnap((prev) => (prev === "peek" ? "half" : prev))
    if (
      !userLocation &&
      typeof navigator !== "undefined" &&
      navigator.geolocation
    ) {
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
  }, [isRoutingActive, userLocation])

  // Sheet swipe handlers mounted exclusively on the handle/header container
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY
    touchCurrentYRef.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentYRef.current = e.touches[0].clientY
  }

  const handleTouchCancel = () => {
    touchStartYRef.current = null
    touchCurrentYRef.current = null
  }

  const handleTouchEnd = () => {
    if (touchStartYRef.current == null || touchCurrentYRef.current == null)
      return
    const deltaY = touchCurrentYRef.current - touchStartYRef.current
    const threshold = 35 // px

    if (deltaY < -threshold) {
      // Swiped UP -> expand
      setSheetSnap((prev) => {
        if (prev === "peek") return "half"
        if (prev === "half") return "full"
        return "full"
      })
    } else if (deltaY > threshold) {
      // Swiped DOWN -> collapse
      setSheetSnap((prev) => {
        if (prev === "full") return "half"
        if (prev === "half") return "peek"
        return "peek"
      })
    }

    touchStartYRef.current = null
    touchCurrentYRef.current = null
  }

  const handleCycleSnap = () => {
    setSheetSnap((prev) => {
      if (prev === "peek") return "half"
      if (prev === "half") return "full"
      return "peek"
    })
  }

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
        recognitionRef.current = null
      }
    }
  }, [])

  const handleVoiceSearch = () => {
    if (typeof window === "undefined") return

    if (isListeningVoice && recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch {
        // ignore
      }
      recognitionRef.current = null
      setIsListeningVoice(false)
      return
    }

    const SpeechRecognition =
      (
        window as unknown as {
          SpeechRecognition?: unknown
          webkitSpeechRecognition?: unknown
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          SpeechRecognition?: unknown
          webkitSpeechRecognition?: unknown
        }
      ).webkitSpeechRecognition

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
        recognitionRef.current = null
      }

      recognition.onerror = () => {
        setIsListeningVoice(false)
        recognitionRef.current = null
      }

      recognition.onend = () => {
        setIsListeningVoice(false)
        recognitionRef.current = null
      }

      recognition.start()
    } catch {
      setIsListeningVoice(false)
      recognitionRef.current = null
    }
  }

  // Keyboard navigation for FloatingNavigationDock tabs
  const handleDockKeyDown = (
    e: React.KeyboardEvent,
    currentTab: "locations" | "services" | "saved"
  ) => {
    const tabs: ("locations" | "services" | "saved")[] = [
      "locations",
      "services",
      "saved",
    ]
    const idx = tabs.indexOf(currentTab)
    if (e.key === "ArrowRight") {
      e.preventDefault()
      const nextTab = tabs[(idx + 1) % tabs.length]
      setActiveTab(nextTab)
      if (nextTab !== "locations") handleDeselectLocation()
      document.getElementById(`tab-${nextTab}`)?.focus()
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      const prevTab = tabs[(idx - 1 + tabs.length) % tabs.length]
      setActiveTab(prevTab)
      if (prevTab !== "locations") handleDeselectLocation()
      document.getElementById(`tab-${prevTab}`)?.focus()
    }
  }

  // Filter Bar Header (Search Box + Sliders + Category Pills)
  const FilterHeaderContent = (
    <div className="flex flex-col gap-2.5 w-full">
      <div className="flex min-w-0 items-center justify-between gap-2 px-1">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 rounded-md text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Compass className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">
            {t.appName}
          </h1>
        </Link>
        <nav
          aria-label="Language and appearance settings"
          className="flex shrink-0 items-center gap-1.5"
        >
          <LanguageToggle />
          <ThemeToggle />
        </nav>
      </div>

      {/* Search Input Row with Sliders Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 flex items-center">
          <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            aria-label={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="h-11 w-full rounded-full border border-border/80 bg-background/95 dark:bg-card/95 backdrop-blur-md pl-10 pr-20 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              aria-label={t.voiceSearch}
              title={t.voiceSearch}
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

        {/* Filter Sliders Toggle Button (Mockup style) */}
        <button
          type="button"
          data-testid="filter-sliders-button"
          onClick={() => setSortByNearest((prev) => !prev)}
          aria-label={sortByNearest ? "Clear distance sort" : "Sort by nearest"}
          title={sortByNearest ? "Sorted by closest" : "Sort by closest"}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border shadow-sm transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            sortByNearest
              ? "border-primary bg-primary text-primary-foreground shadow-md"
              : "border-border/80 bg-background/95 dark:bg-card/95 backdrop-blur-md text-foreground hover:bg-muted/70"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Category Filter Pills (Mockup: All, Academics, Admin, Health, etc.) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <button
          type="button"
          data-testid="category-chip-all"
          onClick={() => setSelectedCategoryId(null)}
          aria-pressed={selectedCategoryId === null}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            selectedCategoryId === null
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm"
              : "bg-background/90 dark:bg-card/90 backdrop-blur-md border border-border/70 text-foreground hover:bg-muted/80"
          )}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>{t.allCategories}</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px]",
              selectedCategoryId === null
                ? "bg-white/20 dark:bg-black/20 text-inherit"
                : "bg-muted text-muted-foreground"
            )}
          >
            {initialLocations.length}
          </span>
        </button>

        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id
          const count = categoryCounts[cat.id] ?? 0
          const localizedName = getLocalizedCategoryName(cat.name, locale)

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
                "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm font-semibold"
                  : "bg-background/90 dark:bg-card/90 backdrop-blur-md border border-border/70 text-foreground hover:bg-muted/80"
              )}
            >
              <CategoryIcon
                iconName={cat.icon}
                className="h-3.5 w-3.5"
                style={{ color: resolveCategoryStyle(cat).color }}
              />
              <span>{localizedName}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px]",
                  isSelected
                    ? "bg-white/20 dark:bg-black/20 text-inherit"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )

  // Floating Navigation Dock (Mockup: [ 📍 Places | ✨ Services | 🔖 Saved ])
  const FloatingNavigationDock = (
    <div
      role="tablist"
      aria-label="Campus Directory sections"
      className="flex items-center rounded-full border border-border/80 bg-background/95 dark:bg-card/95 backdrop-blur-md p-1 shadow-lg pointer-events-auto"
    >
      <button
        type="button"
        role="tab"
        id="tab-locations"
        aria-selected={activeTab === "locations"}
        aria-controls="panel-locations"
        data-testid="tab-locations"
        onClick={() => {
          setActiveTab("locations")
          if (sheetSnap === "peek") setSheetSnap("half")
        }}
        onKeyDown={(e) => handleDockKeyDown(e, "locations")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          activeTab === "locations"
            ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{t.placesTab}</span>
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
          if (sheetSnap === "peek") setSheetSnap("half")
        }}
        onKeyDown={(e) => handleDockKeyDown(e, "services")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          activeTab === "services"
            ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{t.servicesTab}</span>
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
          if (sheetSnap === "peek") setSheetSnap("half")
        }}
        onKeyDown={(e) => handleDockKeyDown(e, "saved")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          activeTab === "saved"
            ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
        <span>
          {t.savedTab} {bookmarks.length > 0 && `(${bookmarks.length})`}
        </span>
      </button>
    </div>
  )

  const snapClasses = {
    peek: "h-[88px]",
    half: "h-[50dvh]",
    full: "h-[calc(100dvh-5.5rem)]",
  }

  return (
    <div className="relative flex h-dvh w-full flex-col font-sans md:flex-row overflow-hidden bg-background">
      {/* Top Floating Header on Mobile (Search & Category Filters) */}
      <div className="md:hidden absolute top-0 left-0 right-0 z-[400] p-3 sm:p-4 bg-gradient-to-b from-background/90 via-background/60 to-transparent pointer-events-none">
        <div className="pointer-events-auto max-w-lg mx-auto">
          {FilterHeaderContent}
        </div>
      </div>

      {/* Fullscreen Map Canvas */}
      <section
        aria-label="Campus Map"
        className="absolute inset-0 w-full h-full md:relative md:order-2 md:flex-1 md:h-full"
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
          locateControlClassName={cn(
            "transition-all duration-300 md:bottom-5",
            sheetSnap === "peek"
              ? "bottom-28"
              : sheetSnap === "half"
                ? "bottom-[calc(50dvh+1rem)]"
                : "hidden"
          )}
        />
      </section>

      {/* Mobile Draggable Bottom Sheet & Desktop Sidebar */}
      <section
        aria-label="Campus Directory"
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[450] flex flex-col rounded-t-[28px] border-t border-border/80 bg-[#FAF9F6]/95 dark:bg-card/95 backdrop-blur-md shadow-2xl transition-all duration-300 ease-out",
          snapClasses[sheetSnap],
          "md:static md:z-auto md:h-full md:w-[400px] lg:w-[440px] md:rounded-none md:border-t-0 md:border-r md:shadow-none md:bg-background"
        )}
      >
        {/* Mobile Drag Handle Container (Touch handlers exclusively on the handle/header) */}
        <div
          data-testid="bottom-sheet-handle-container"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          className="md:hidden flex flex-col items-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing select-none"
        >
          <button
            type="button"
            data-testid="bottom-sheet-handle"
            onClick={handleCycleSnap}
            aria-label={`Bottom sheet is ${sheetSnap}. Click to toggle height.`}
            aria-expanded={sheetSnap !== "peek"}
            className="h-1.5 w-12 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50 transition-colors"
          />
        </div>

        {/* Desktop Sidebar Header (Hidden on Mobile) */}
        <div className="hidden md:flex flex-col border-b border-border p-4 bg-background">
          {FilterHeaderContent}
        </div>

        {/* Subheader: Places Nearby count and Closest sort toggle (Mockup style) */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          className="flex items-center justify-between px-4 py-2 border-b border-border/60 shrink-0 text-xs"
        >
          <div className="flex items-center gap-1.5 font-bold text-foreground sm:text-sm">
            <span>
              {displayLocations.length}{" "}
              {displayLocations.length === 1
                ? t.locationCountSingular
                : t.placesNearby}
            </span>
            {mapItemCount > 0 && (
              <span className="text-[11px] font-normal text-muted-foreground">
                ({mapItemCount} {t.onMap})
              </span>
            )}
          </div>

          <button
            type="button"
            data-testid="nearby-sort-toggle"
            onClick={() => setSortByNearest((prev) => !prev)}
            aria-pressed={sortByNearest}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              sortByNearest
                ? "bg-blue-600 text-white"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span>{t.closest}</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
        </div>

        {/* Sheet / Panel Body */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {activeTab === "services" ? (
            /* Services Panel */
            <div
              id="panel-services"
              role="tabpanel"
              aria-labelledby="tab-services"
              className="flex flex-1 flex-col overflow-y-auto p-3 sm:p-4 pb-20 md:pb-16"
            >
              <ServicesList
                services={initialServices}
                allLocations={initialLocations}
                onSelectLocation={handleSelectLocation}
              />
            </div>
          ) : activeTab === "saved" ? (
            /* Saved Places Panel */
            <div
              id="panel-saved"
              role="tabpanel"
              aria-labelledby="tab-saved"
              className="flex flex-1 flex-col overflow-y-auto p-3 sm:p-4 pb-20 md:pb-16"
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
              )}
            </div>
          ) : (
            /* Places Panel */
            <div
              id="panel-locations"
              role="tabpanel"
              aria-labelledby="tab-locations"
              className="flex flex-1 flex-col overflow-y-auto p-3 sm:p-4 pb-20 md:pb-16"
            >
              {selectedLocation && showFullDetails ? (
                /* Full details view */
                <LocationDetailPanel
                  location={selectedLocation}
                  allLocations={initialLocations}
                  onBack={() => setShowFullDetails(false)}
                  onSelectLocation={handleSelectLocation}
                  distanceMeters={distanceMap.get(selectedLocation.id) ?? null}
                  onStartDirections={handleStartDirections}
                  isRoutingActive={isRoutingActive}
                  isBookmarked={isBookmarked(selectedLocation.id)}
                  onToggleBookmark={toggleBookmark}
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Featured Location Card (Mockup style) */}
                  {selectedLocation && (
                    <FeaturedLocationCard
                      location={selectedLocation}
                      distanceMeters={
                        distanceMap.get(selectedLocation.id) ?? null
                      }
                      isRoutingActive={isRoutingActive}
                      isBookmarked={isBookmarked(selectedLocation.id)}
                      onStartDirections={handleStartDirections}
                      onToggleBookmark={toggleBookmark}
                      onViewDetails={() => setShowFullDetails(true)}
                      onClose={handleDeselectLocation}
                    />
                  )}

                  {/* List of Locations (excluding currently featured or full list) */}
                  {displayLocations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
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
                      {displayLocations
                        .filter((loc) =>
                          selectedLocation
                            ? loc.id !== selectedLocation.id
                            : true
                        )
                        .map((location) => (
                          <LocationListItem
                            key={location.id}
                            location={location}
                            onClick={handleSelectLocation}
                            distanceMeters={
                              distanceMap.get(location.id) ?? null
                            }
                          />
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Bottom Floating Navigation Dock (Centered over sheet) */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            {FloatingNavigationDock}
          </div>
        </div>
      </section>
    </div>
  )
}
