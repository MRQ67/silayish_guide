import type { Location } from "@/lib/types"
import { CodeBadge } from "@/components/code-badge"

export interface MapPopupProps {
  location: Location
  className?: string
}

export function MapPopup({ location, className = "" }: MapPopupProps) {
  return (
    <div
      data-testid="map-popup"
      className={`flex max-w-xs flex-col gap-2 p-1 font-sans text-sm ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-1.5">
        <h4 className="font-semibold leading-tight text-foreground">
          {location.name}
        </h4>
        <CodeBadge code={location.code} />
      </div>
      {location.description && (
        <p className="text-xs text-muted-foreground">{location.description}</p>
      )}
      {location.opening_hours && (
        <div className="text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">Hours: </span>
          {location.opening_hours}
        </div>
      )}
    </div>
  )
}
