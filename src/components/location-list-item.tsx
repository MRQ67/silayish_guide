"use client"

import { Navigation } from "lucide-react"
import type { Location } from "@/lib/types"
import { CodeBadge } from "@/components/code-badge"
import { CategoryIcon } from "@/components/category-icon"
import { useLanguage } from "@/components/language-provider"
import { formatDistance, getLocalizedCategoryName } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n"
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

  const content = (
    <>
      <div className="flex flex-col gap-1 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-foreground">{location.name}</span>
          <CodeBadge code={location.code} />
          {distanceMeters != null && (
            <span
              data-testid="location-distance-badge"
              className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
            >
              <Navigation className="h-2.5 w-2.5" />
              <span>{formatDistance(distanceMeters, locale)}</span>
            </span>
          )}
        </div>
        {location.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {location.description}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
          {location.type}
        </span>
        {location.category && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <CategoryIcon
              iconName={location.category.icon}
              className="h-3 w-3"
            />
            <span className="max-w-[110px] truncate">{categoryName}</span>
          </span>
        )}
      </div>
    </>
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
          "flex w-full cursor-pointer items-start justify-between gap-3 rounded-lg border bg-card p-3 font-sans text-card-foreground shadow-xs transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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
        "flex items-start justify-between gap-3 rounded-lg border bg-card p-3 font-sans text-card-foreground shadow-xs transition-colors",
        className
      )}
    >
      {content}
    </article>
  )
}
