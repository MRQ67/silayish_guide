import type { Location } from "@/lib/types"
import { CodeBadge } from "@/components/code-badge"
import { cn } from "@/lib/utils"

export interface LocationListItemProps {
  location: Location
  onClick?: (location: Location) => void
  className?: string
}

export function LocationListItem({
  location,
  onClick,
  className,
}: LocationListItemProps) {
  const content = (
    <>
      <div className="flex flex-col gap-1 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-foreground">{location.name}</span>
          <CodeBadge code={location.code} />
        </div>
        {location.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {location.description}
          </p>
        )}
      </div>
      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
        {location.type}
      </span>
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
