"use client"

import { useMemo } from "react"
import { Clock, Mail, MapPin, Phone } from "lucide-react"
import type { Location, Service } from "@/lib/types"
import { CodeBadge } from "@/components/code-badge"
import { useLanguage } from "@/components/language-provider"
import type { TranslationDictionary } from "@/lib/i18n"
import { translations } from "@/lib/i18n"

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
  let t: TranslationDictionary = translations.en
  try {
    const langCtx = useLanguage()
    t = langCtx.t
  } catch {
    // outside provider in unit tests
  }

  // O(1) location lookup map
  const locationsMap = useMemo(() => {
    return new Map(allLocations.map((l) => [l.id, l]))
  }, [allLocations])

  if (services.length === 0) {
    return (
      <div
        data-testid="services-empty"
        className="flex flex-col items-center justify-center p-8 text-center font-sans"
      >
        <p className="font-semibold text-foreground">
          {t.servicesEmptyTitle}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t.servicesEmptyDesc}
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
          ? locationsMap.get(service.location_id) || service.location
          : service.location

        const contactStr = service.contact?.trim()
        const isEmail = contactStr ? contactStr.includes("@") : false
        const isPhone = contactStr ? /^[\d+\s().-]+$/.test(contactStr) : false

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
                  <span>{t.onMap}</span>
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
              {contactStr && (
                isEmail ? (
                  <a
                    href={`mailto:${contactStr}`}
                    className="flex items-center gap-1 hover:text-foreground hover:underline"
                  >
                    <Mail className="h-3 w-3" />
                    <span>{contactStr}</span>
                  </a>
                ) : isPhone ? (
                  <a
                    href={`tel:${contactStr.replace(/\s+/g, "")}`}
                    className="flex items-center gap-1 hover:text-foreground hover:underline"
                  >
                    <Phone className="h-3 w-3" />
                    <span>{contactStr}</span>
                  </a>
                ) : (
                  <span className="flex items-center gap-1">
                    <span>{contactStr}</span>
                  </span>
                )
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
