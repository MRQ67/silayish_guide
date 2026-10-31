"use client"

import { ArrowLeft, Clock, ExternalLink, Layers } from "lucide-react"
import type { Location } from "@/lib/types"
import { CodeBadge } from "@/components/code-badge"
import { CategoryIcon } from "@/components/category-icon"
import { ShareLocationButton } from "@/components/share-location-button"
import { ReportProblemDialog } from "@/components/report-problem-dialog"
import { cn } from "@/lib/utils"

export interface LocationDetailPanelProps {
  location: Location
  allLocations: Location[]
  onBack: () => void
  onSelectLocation: (location: Location) => void
  className?: string
}

export function LocationDetailPanel({
  location,
  allLocations,
  onBack,
  onSelectLocation,
  className = "",
}: LocationDetailPanelProps) {
  // Find nested facilities/labs inside this parent building
  const childLocations = allLocations.filter(
    (l) => l.parent_id === location.id
  )

  // Find parent complex if this is a nested room/lab
  const parentLocation = location.parent_id
    ? allLocations.find((l) => l.id === location.parent_id)
    : null

  const googleMapsDirectionsUrl =
    location.lat != null && location.lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`
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
        type="button"
        onClick={onBack}
        data-testid="detail-back-button"
        className="mb-3 inline-flex items-center gap-1.5 self-start rounded-md px-1 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to all locations</span>
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
                  <span>{location.category.name}</span>
                </span>
              )}
              {location.floor != null && (
                <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                  Floor {location.floor}
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
            <span className="text-muted-foreground">Located inside:</span>
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
                Hours:{" "}
              </span>
              <span className="text-muted-foreground">
                {location.opening_hours}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-2 border-t border-b border-border py-2">
          <ShareLocationButton location={location} />
          <ReportProblemDialog
            locationId={location.id}
            locationName={location.name}
          />
          {googleMapsDirectionsUrl && (
            <a
              href={googleMapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Directions</span>
            </a>
          )}
        </div>

        {/* Child facilities inside this building */}
        {childLocations.length > 0 && (
          <div className="mt-1 flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Places Inside ({childLocations.length})
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
                        Floor {child.floor}
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
