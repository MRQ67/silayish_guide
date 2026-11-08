"use client"

import { Bookmark, CornerUpRight, Info, X } from "lucide-react"
import type { Location } from "@/lib/types"
import { CodeBadge } from "@/components/code-badge"
import { CategoryIcon } from "@/components/category-icon"
import { ShareLocationButton } from "@/components/share-location-button"
import { useLanguage } from "@/components/language-provider"
import {
  formatDistance,
  formatWalkingTime,
  getLocalizedCategoryName,
  translations,
} from "@/lib/i18n"
import type { Locale, TranslationDictionary } from "@/lib/i18n"
import { getCategoryBadgeClasses } from "@/lib/category-badge-utils"
import { cn } from "@/lib/utils"

export interface FeaturedLocationCardProps {
  location: Location
  distanceMeters?: number | null
  isRoutingActive?: boolean
  isBookmarked?: boolean
  onStartDirections?: () => void
  onToggleBookmark?: (id: string) => void
  onViewDetails?: () => void
  onClose?: () => void
  className?: string
}

export function FeaturedLocationCard({
  location,
  distanceMeters,
  isRoutingActive = false,
  isBookmarked = false,
  onStartDirections,
  onToggleBookmark,
  onViewDetails,
  onClose,
  className,
}: FeaturedLocationCardProps) {
  let locale: Locale = "en"
  let t: TranslationDictionary = translations.en

  try {
    const langCtx = useLanguage()
    locale = langCtx.locale
    t = langCtx.t
  } catch {
    // outside provider
  }

  const categoryName = location.category
    ? getLocalizedCategoryName(location.category.name, locale)
    : null

  const badgeColors = getCategoryBadgeClasses(location.category)

  return (
    <div
      data-testid="featured-location-card"
      className={cn(
        "relative flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-sm font-sans transition-all",
        className
      )}
    >
      {/* Top close button if onClose provided */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={t.backToAll}
          className="absolute top-2.5 right-2.5 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Row 1: Squircle Icon + Name/Code/Desc/Hours */}
      <div className="flex items-start gap-3">
        {/* Squircle category icon */}
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors",
            badgeColors.bg,
            badgeColors.text
          )}
          style={badgeColors.style}
        >
          <CategoryIcon
            iconName={location.category?.icon || "map-pin"}
            className="h-6 w-6"
          />
        </div>

        <div className="flex flex-col min-w-0 flex-1 pr-5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-bold text-foreground text-base sm:text-lg leading-tight">
              {location.name}
            </h3>
            <CodeBadge code={location.code} />
          </div>

          {location.description && (
            <p className="line-clamp-1 mt-0.5 text-xs text-muted-foreground">
              {location.description}
            </p>
          )}

          {/* Status & Distance Meta Line */}
          <div className="mt-1 flex items-center gap-1.5 text-xs flex-wrap">
            {location.opening_hours ? (
              <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{location.opening_hours}</span>
              </span>
            ) : categoryName ? (
              <span className="text-muted-foreground font-medium">
                {categoryName}
              </span>
            ) : null}

            {distanceMeters != null && (
              <>
                <span className="text-muted-foreground/60">·</span>
                <span
                  data-testid="featured-card-distance"
                  className="font-medium text-foreground/80 inline-flex items-center gap-1"
                >
                  <span>{formatWalkingTime(distanceMeters, locale)}</span>
                  <span className="text-muted-foreground">
                    · {formatDistance(distanceMeters, locale)}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Action Buttons (Mockup: Primary Directions pill + Bookmark square + Share square) */}
      <div className="flex items-center gap-2 pt-1">
        {onStartDirections && (
          <button
            type="button"
            onClick={onStartDirections}
            data-testid="featured-directions-button"
            aria-pressed={isRoutingActive}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 px-4 text-xs font-semibold shadow-xs transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isRoutingActive
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
            )}
          >
            <CornerUpRight className="h-4 w-4" />
            <span>{isRoutingActive ? t.stopDirections : t.getDirections}</span>
          </button>
        )}

        {onToggleBookmark && (
          <button
            type="button"
            onClick={() => onToggleBookmark(location.id)}
            data-testid="featured-bookmark-button"
            aria-pressed={isBookmarked}
            aria-label={isBookmarked ? t.unbookmarkPlace : t.bookmarkPlace}
            title={isBookmarked ? t.unbookmarkPlace : t.bookmarkPlace}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors hover:bg-muted active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isBookmarked
                ? "border-amber-400 bg-amber-500/10 text-amber-500"
                : "border-border/80 bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            <Bookmark
              className={cn("h-4 w-4", isBookmarked && "fill-amber-500")}
            />
          </button>
        )}

        <ShareLocationButton
          location={location}
          className="h-10 px-3 rounded-xl border border-border/80 bg-card text-muted-foreground hover:text-foreground"
        />

        {onViewDetails && (
          <button
            type="button"
            onClick={onViewDetails}
            data-testid="featured-view-details-button"
            aria-label={t.viewFullDetails}
            title={t.viewFullDetails}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Info className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
