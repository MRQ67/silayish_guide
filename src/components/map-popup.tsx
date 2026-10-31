"use client"

import type { Location } from "@/lib/types"
import { CodeBadge } from "@/components/code-badge"
import { ReportProblemDialog } from "@/components/report-problem-dialog"
import { ShareLocationButton } from "@/components/share-location-button"
import { useLanguage } from "@/components/language-provider"
import { translations } from "@/lib/i18n"
import type { TranslationDictionary } from "@/lib/i18n"

export interface MapPopupProps {
  location: Location
  className?: string
}

export function MapPopup({ location, className = "" }: MapPopupProps) {
  let t: TranslationDictionary = translations.en
  try {
    const langCtx = useLanguage()
    t = langCtx.t
  } catch {
    // outside provider
  }

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
          <span className="font-medium text-foreground">{t.operatingHours}: </span>
          {location.opening_hours}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
        <ShareLocationButton location={location} />
        <ReportProblemDialog
          locationId={location.id}
          locationName={location.name}
        />
      </div>
    </div>
  )
}
