"use client"

import { Clock, Mail, MapPin } from "lucide-react"
import type { Location, Service } from "@/lib/types"
import { CodeBadge } from "@/components/code-badge"

export interface ServicesListProps {
  services: Service[]
  allLocations: Location[]
  onSelectLocation: (location: Location) => void
}

export function ServicesList({
  services,
  allLocations,
  onSelectLocation,
}: ServicesListProps) {
  if (services.length === 0) {
    return (
      <div
        data-testid="services-empty"
        className="flex flex-col items-center justify-center p-8 text-center font-sans"
      >
        <p className="font-semibold text-foreground">
          No campus services listed
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Administrative and student services will appear here.
        </p>
      </div>
    )
  }

  return (
    <div
      data-testid="services-list"
      className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3 sm:p-4 font-sans"
    >
      {services.map((service) => {
        const linkedLocation = service.location_id
          ? allLocations.find((l) => l.id === service.location_id) ||
            service.location
          : service.location

        return (
          <article
            key={service.id}
            data-testid="service-item"
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-2xs"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-foreground text-sm">
                {service.name}
              </h3>
              {linkedLocation && (
                <button
                  type="button"
                  onClick={() => onSelectLocation(linkedLocation)}
                  title={`View ${linkedLocation.name} on map`}
                  data-testid={`service-on-map-${service.id}`}
                  className="inline-flex shrink-0 items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <MapPin className="h-3 w-3" />
                  <span>On Map</span>
                </button>
              )}
            </div>

            {service.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {service.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1.5 text-[11px] text-muted-foreground border-t border-border/50">
              {service.hours && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{service.hours}</span>
                </span>
              )}
              {service.contact && (
                <a
                  href={`mailto:${service.contact}`}
                  className="flex items-center gap-1 hover:text-foreground hover:underline"
                >
                  <Mail className="h-3 w-3" />
                  <span>{service.contact}</span>
                </a>
              )}
              {linkedLocation && (
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <span>{linkedLocation.name}</span>
                  {linkedLocation.code && (
                    <CodeBadge code={linkedLocation.code} />
                  )}
                </span>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
