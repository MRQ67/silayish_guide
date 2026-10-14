import type { Location } from "@/lib/types"
import { CodeBadge } from "@/components/code-badge"

export interface LocationListItemProps {
  location: Location
  onClick?: (location: Location) => void
  className?: string
}

export function LocationListItem({
  location,
  onClick,
  className = "",
}: LocationListItemProps) {
  return (
    <article
      data-testid="location-list-item"
      onClick={() => onClick?.(location)}
      className={`flex items-start justify-between gap-3 rounded-lg border bg-card p-3 font-sans text-card-foreground shadow-xs transition-colors hover:bg-muted/50 ${className}`}
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-foreground">{location.name}</span>
          <CodeBadge code={location.code} />
        </div>
        {location.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {location.description}
          </p>
        )}
      </div>
      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
        {location.type}
      </span>
    </article>
  )
}
