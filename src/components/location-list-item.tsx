"use client"

import { ChevronRight } from "lucide-react"
import type { Location } from "@/lib/types"
import { CodeBadge } from "@/components/code-badge"
import { CategoryIcon } from "@/components/category-icon"
import { useLanguage } from "@/components/language-provider"
import {
  formatDistance,
  formatWalkingTime,
  getLocalizedCategoryName,
} from "@/lib/i18n"
import type { Locale } from "@/lib/i18n"
import { getCategoryBadgeClasses } from "@/lib/category-badge-utils"
import { cn } from "@/lib/utils"

export interface LocationListItemProps {
  location: Location
  onClick?: (location: Location) => void
  distanceMeters?: number | null
  className?: string
}

export function LocationListItem({
  location,
  onClick,
  distanceMeters,
  className,
}: LocationListItemProps) {
  let locale: Locale = "en"
  try {
    const langCtx = useLanguage()
    locale = langCtx.locale
  } catch {
    // outside provider in unit tests
  }

  const categoryName = location.category
    ? getLocalizedCategoryName(location.category.name, locale)
    : null

  const badgeColors = getCategoryBadgeClasses(location.category)

  const content = (
    <div className="flex w-full items-center justify-between gap-3 text-left">
      <div className="flex items-center gap-3 min-w-0">
        {/* Squircle category icon (Mockup style) */}
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors",
            badgeColors.bg,
            badgeColors.text
          )}
          style={badgeColors.style}
        >
          <CategoryIcon
            iconName={location.category?.icon || "map-pin"}
            className="h-5 w-5"
          />
        </div>

        {/* Text details */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-foreground text-sm sm:text-base leading-snug truncate">
              {location.name}
            </span>
            <CodeBadge code={location.code} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
            {categoryName && <span>{categoryName}</span>}
            {categoryName && distanceMeters != null && (
              <span className="text-muted-foreground/60">·</span>
            )}
            {distanceMeters != null && (
              <span
                data-testid="location-distance-badge"
                className="inline-flex items-center gap-1 font-medium text-foreground/80"
              >
                <span>{formatWalkingTime(distanceMeters, locale)}</span>
                <span className="text-muted-foreground">
                  ({formatDistance(distanceMeters, locale)})
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      <ChevronRight
        className="h-5 w-5 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </div>
  )

  if (onClick) {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        if (e.key === " " || e.key === "Spacebar") {
          e.preventDefault()
        }
        onClick(location)
      }
    }

    return (
      <div
        id={`location-item-${location.id}`}
        role="button"
        tabIndex={0}
        data-testid="location-list-item"
        onClick={() => onClick(location)}
        onKeyDown={handleKeyDown}
        className={cn(
          "group flex w-full cursor-pointer items-center justify-between rounded-2xl border border-border/70 bg-card p-3 font-sans text-card-foreground shadow-2xs transition-all hover:bg-muted/40 hover:border-border active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
      >
        {content}
      </div>
    )
  }

  return (
    <article
      id={`location-item-${location.id}`}
      data-testid="location-list-item"
      className={cn(
        "flex w-full items-center justify-between rounded-2xl border border-border/70 bg-card p-3 font-sans text-card-foreground shadow-2xs transition-colors",
        className
      )}
    >
      {content}
    </article>
  )
}
