"use client"

import { useEffect, useRef } from "react"
import {
  ArrowLeft,
  Bookmark,
  Clock,
  CornerUpRight,
  ExternalLink,
  Layers,
  Navigation,
} from "lucide-react"
import type { Location } from "@/lib/types"
import { CodeBadge } from "@/components/code-badge"
import { CategoryIcon } from "@/components/category-icon"
import { ShareLocationButton } from "@/components/share-location-button"
import { ReportProblemDialog } from "@/components/report-problem-dialog"
import { calculateOutlineCenter } from "@/lib/validations/outline"
import { useLanguage } from "@/components/language-provider"
import {
  formatDistance,
  formatWalkingTime,
  getLocalizedCategoryName,
} from "@/lib/i18n"
import type { Locale, TranslationDictionary } from "@/lib/i18n"
import { translations } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export interface LocationDetailPanelProps {
  location: Location
  allLocations: Location[]
  onBack: () => void
  onSelectLocation: (location: Location) => void
  distanceMeters?: number | null
  onStartDirections?: () => void
  isRoutingActive?: boolean
  isBookmarked?: boolean
  onToggleBookmark?: (locationId: string) => void
  className?: string
}

function getEffectiveCoordinates(
  loc: Location,
  parentLoc: Location | null | undefined
): { lat: number; lng: number } | null {
  if (loc.lat != null && loc.lng != null) {
    return { lat: loc.lat, lng: loc.lng }
  }
  if (loc.outline) {
    try {
      return calculateOutlineCenter(loc.outline)
    } catch {
      // ignore outline parsing failures
    }
  }
  if (parentLoc) {
    if (parentLoc.lat != null && parentLoc.lng != null) {
      return { lat: parentLoc.lat, lng: parentLoc.lng }
    }
    if (parentLoc.outline) {
      try {
        return calculateOutlineCenter(parentLoc.outline)
      } catch {
        // ignore outline parsing failures
      }
    }
  }
  return null
}

export function LocationDetailPanel({
  location,
  allLocations,
  onBack,
  onSelectLocation,
  distanceMeters,
  onStartDirections,
  isRoutingActive = false,
  isBookmarked = false,
  onToggleBookmark,
  className = "",
}: LocationDetailPanelProps) {
  let locale: Locale = "en"
  let t: TranslationDictionary = translations.en

  try {
    const langCtx = useLanguage()
    locale = langCtx.locale
    t = langCtx.t
  } catch {
    // outside provider in unit tests
  }

  const backButtonRef = useRef<HTMLButtonElement>(null)

  // Focus the back button when panel mounts and bind Escape key to close
  useEffect(() => {
    backButtonRef.current?.focus()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onBack()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onBack])

  // Find nested facilities/labs inside this parent building
  const childLocations = allLocations.filter(
    (l) => l.parent_id === location.id
  )

  // Find parent complex if this is a nested room/lab
  const parentLocation = location.parent_id
    ? allLocations.find((l) => l.id === location.parent_id)
    : null

  const effectiveCoords = getEffectiveCoordinates(location, parentLocation)
  const googleMapsDirectionsUrl = effectiveCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${effectiveCoords.lat},${effectiveCoords.lng}`
    : null

  const categoryName = location.category
    ? getLocalizedCategoryName(location.category.name, locale)
    : null

  return (
    <div
      data-testid="location-detail-panel"
      className={cn(
        "flex flex-1 flex-col overflow-y-auto p-3 sm:p-4 font-sans",
        className
      )}
    >
      {/* Back button */}
      <button
        ref={backButtonRef}
        type="button"
        onClick={onBack}
        data-testid="detail-back-button"
        className="mb-3 inline-flex items-center gap-1.5 self-start rounded-md px-1 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{t.backToAll}</span>
      </button>

      {/* Main details card */}
      <div className="flex flex-col gap-3">
        {/* Title, Code, Badges */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
              {location.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium uppercase text-muted-foreground">
                {location.type}
              </span>
              {location.category && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CategoryIcon
                    iconName={location.category.icon}
                    className="h-3.5 w-3.5"
                  />
                  <span>{categoryName}</span>
                </span>
              )}
              {location.floor != null && (
                <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                  {t.floorPrefix} {location.floor}
                </span>
              )}
              {distanceMeters != null && (
                <span
                  data-testid="detail-distance-badge"
                  className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
                >
                  <Navigation className="h-3 w-3" aria-hidden="true" />
                  <span>{formatDistance(distanceMeters, locale)}</span>
                  <span className="text-muted-foreground font-normal">
                    ({formatWalkingTime(distanceMeters, locale)})
                  </span>
                </span>
              )}
            </div>
          </div>
          <CodeBadge code={location.code} />
        </div>

        {/* Parent Location Reference */}
        {parentLocation && (
          <div className="flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/30 p-2 text-xs">
            <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">{t.locatedInside}:</span>
            <button
              type="button"
              onClick={() => onSelectLocation(parentLocation)}
              className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              {parentLocation.name}
            </button>
          </div>
        )}

        {/* Description */}
        {location.description && (
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
            {location.description}
          </p>
        )}

        {/* Operating Hours */}
        {location.opening_hours && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5 text-xs shadow-2xs">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <div>
              <span className="font-semibold text-foreground">
                {t.operatingHours}:{" "}
              </span>
              <span className="text-muted-foreground">
                {location.opening_hours}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons Row (Mockup Style: Primary Directions + Bookmark + Share) */}
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card/60 p-3 shadow-xs">
          <div className="flex items-center gap-2">
            {onStartDirections && (
              <button
                type="button"
                onClick={onStartDirections}
                data-testid="start-directions-button"
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 px-4 text-xs font-semibold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isRoutingActive
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-foreground text-background hover:bg-foreground/90"
                )}
              >
                <CornerUpRight className="h-4 w-4" />
                <span>
                  {isRoutingActive ? t.stopDirections : t.getDirections}
                </span>
              </button>
            )}

            {onToggleBookmark && (
              <button
                type="button"
                onClick={() => onToggleBookmark(location.id)}
                data-testid="bookmark-location-button"
                aria-label={
                  isBookmarked ? t.unbookmarkPlace : t.bookmarkPlace
                }
                title={isBookmarked ? t.unbookmarkPlace : t.bookmarkPlace}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isBookmarked
                    ? "border-amber-400 bg-amber-500/10 text-amber-500"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Bookmark
                  className={cn("h-4 w-4", isBookmarked && "fill-current")}
                />
              </button>
            )}

            <ShareLocationButton location={location} />
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2 text-xs">
            <ReportProblemDialog
              locationId={location.id}
              locationName={location.name}
            />
            {googleMapsDirectionsUrl && (
              <a
                href={googleMapsDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Directions to ${location.name} on Google Maps (opens in new tab)`}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                <span>{t.directions}</span>
                <span className="sr-only">(opens in new tab)</span>
              </a>
            )}
          </div>
        </div>

        {/* Child facilities inside this building */}
        {childLocations.length > 0 && (
          <div className="mt-1 flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t.placesInside} ({childLocations.length})
            </h3>
            <div className="flex flex-col gap-1.5">
              {childLocations.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => onSelectLocation(child)}
                  data-testid={`child-location-${child.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2.5 text-left text-xs transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-foreground">
                      {child.name}
                    </span>
                    {child.floor != null && (
                      <span className="text-[11px] text-muted-foreground">
                        {t.floorPrefix} {child.floor}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CodeBadge code={child.code} />
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                      {child.type}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
