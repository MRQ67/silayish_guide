"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

import type { Location } from "@/lib/types"
import type { MapMarker } from "@/lib/map-utils"
import {
  calculateMapBounds,
  calculateMapCenter,
  DDU_CAMPUS_CENTER,
  getMapMarkers,
  isValidCoordinate,
} from "@/lib/map-utils"
import { fixLeafletDefaultIcon } from "@/lib/leaflet-fix"
import {
  getTileLayerConfig,
  OUTLINE_LABEL_MIN_ZOOM,
} from "@/lib/map-config"
import {
  geoJsonToLeafletPositions,
  getOutlineLabelPosition,
  getOutlineStyle,
  isOutlineWideEnough,
} from "@/lib/outline-utils"
import { calculateOutlineBounds } from "@/lib/validations/outline"
import { getLocationEffectiveCoordinates } from "@/lib/location-utils"
import { createCategoryPinIcon } from "@/lib/category-pin-utils"
import { MapPopup } from "@/components/map-popup"
import { LocateControl } from "@/components/locate-control"
import { useTheme } from "@/components/theme-provider"

fixLeafletDefaultIcon()

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

interface MapBoundsControllerProps {
  visibleLocations: Location[]
}

function MapBoundsController({ visibleLocations }: MapBoundsControllerProps) {
  const map = useMap()
  const previousCountRef = useRef<number | null>(null)

  useEffect(() => {
    // Only adjust bounds if the count changed or on initial display
    if (visibleLocations.length === 0) {
      if (previousCountRef.current !== 0) {
        map.setView(DDU_CAMPUS_CENTER, 16)
        previousCountRef.current = 0
      }
      return
    }

    const bounds = calculateMapBounds(visibleLocations)
    if (bounds) {
      map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 18,
      })
    }
    previousCountRef.current = visibleLocations.length
  }, [map, visibleLocations])

  return null
}

interface MapSelectionControllerProps {
  selectedLocation: Location | null
  markerRefs: React.RefObject<Map<string, L.Marker>>
  polygonRefs: React.RefObject<Map<string, L.Polygon>>
  allLocations?: Location[]
  isRoutingActive?: boolean
}

function MapSelectionController({
  selectedLocation,
  markerRefs,
  polygonRefs,
  allLocations,
  isRoutingActive,
}: MapSelectionControllerProps) {
  const map = useMap()

  useEffect(() => {
    if (!selectedLocation || isRoutingActive) return

    // 1. If location has its own outline, fit map to outline and open popup
    if (selectedLocation.outline) {
      const bounds = calculateOutlineBounds(selectedLocation.outline)
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 19, animate: true })
      const polygon = polygonRefs.current?.get(selectedLocation.id)
      const labelPos = getOutlineLabelPosition(selectedLocation.outline)
      polygon?.openPopup(labelPos)
      return
    }

    // 2. If location has a parent that has an outline, fit to parent's outline
    if (selectedLocation.parent_id && allLocations) {
      const parent = allLocations.find((l) => l.id === selectedLocation.parent_id)
      if (parent?.outline) {
        const bounds = calculateOutlineBounds(parent.outline)
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 19, animate: true })
        const parentPolygon = polygonRefs.current?.get(parent.id)
        const labelPos = getOutlineLabelPosition(parent.outline)
        parentPolygon?.openPopup(labelPos)
        return
      }
    }

    // 3. If location has a standalone pin marker, center on it and open popup
    if (
      isValidCoordinate(selectedLocation.lat, selectedLocation.lng) &&
      selectedLocation.lat != null &&
      selectedLocation.lng != null
    ) {
      const targetPos: [number, number] = [
        selectedLocation.lat,
        selectedLocation.lng,
      ]
      map.setView(targetPos, Math.max(map.getZoom(), 17), { animate: true })
      const marker = markerRefs.current?.get(selectedLocation.id)
      marker?.openPopup()
    }
  }, [map, selectedLocation, markerRefs, polygonRefs, allLocations, isRoutingActive])

  return null
}

interface MapRouteControllerProps {
  isRoutingActive?: boolean
  userLocation?: [number, number] | null
  destCoords?: { lat: number; lng: number } | null
}

function MapRouteController({
  isRoutingActive,
  userLocation,
  destCoords,
}: MapRouteControllerProps) {
  const map = useMap()

  useEffect(() => {
    if (!isRoutingActive || !userLocation || !destCoords) return
    const bounds = L.latLngBounds([
      userLocation,
      [destCoords.lat, destCoords.lng],
    ])
    map.fitBounds(bounds, {
      padding: [70, 70],
      maxZoom: 18,
      animate: true,
    })
  }, [isRoutingActive, userLocation, destCoords, map])

  return null
}

interface OutlineLabelsProps {
  outlines: Location[]
}

function OutlineLabels({ outlines }: OutlineLabelsProps) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  const [, setTick] = useState(0)

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    moveend: () => setTick((t) => t + 1),
    resize: () => setTick((t) => t + 1),
  })

  // Only render code labels when zoomed in enough (zoom 17+)
  if (zoom < OUTLINE_LABEL_MIN_ZOOM) {
    return null
  }

  return (
    <>
      {outlines.map((location) => {
        if (!location.outline || !location.code) return null

        const bounds = calculateOutlineBounds(location.outline)
        const p1 = map.latLngToContainerPoint([bounds[0][0], bounds[0][1]])
        const p2 = map.latLngToContainerPoint([bounds[1][0], bounds[1][1]])
        const pixelWidth = Math.abs(p2.x - p1.x)
        const pixelHeight = Math.abs(p2.y - p1.y)

        // Only show if the polygon is wide enough on screen that the code fits
        if (!isOutlineWideEnough(pixelWidth, pixelHeight, location.code)) {
          return null
        }

        const labelPos = getOutlineLabelPosition(location.outline)

        const icon = L.divIcon({
          className: "pointer-events-none !bg-transparent !border-0",
          html: `<div class="outline-code-badge font-stencil pointer-events-none select-none">${escapeHtml(location.code)}</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        })

        return (
          <Marker
            key={`label-${location.id}`}
            position={labelPos}
            icon={icon}
            interactive={false}
          />
        )
      })}
    </>
  )
}

export interface CampusMapProps {
  locations?: Location[]
  allLocations?: Location[]
  markers?: MapMarker[]
  selectedLocation: Location | null
  userLocation?: [number, number] | null
  isRoutingActive?: boolean
  onSelectLocation?: (location: Location) => void
  onUserLocationChange?: (coords: [number, number]) => void
  onToggleRouting?: (active: boolean) => void
  className?: string
}

export default function CampusMap({
  locations,
  allLocations,
  markers,
  selectedLocation,
  userLocation,
  isRoutingActive = false,
  onSelectLocation,
  onUserLocationChange,
  className = "",
}: CampusMapProps) {
  useEffect(() => {
    fixLeafletDefaultIcon()
  }, [])

  let resolvedTheme: "light" | "dark" = "light"
  try {
    const themeCtx = useTheme()
    resolvedTheme = themeCtx.resolvedTheme
  } catch {
    // rendered outside theme provider (e.g. standalone test)
  }

  const markerRefs = useRef<Map<string, L.Marker>>(new Map())
  const polygonRefs = useRef<Map<string, L.Polygon>>(new Map())

  // Compute outlines to display from current locations and optional parent lookup
  const outlines = useMemo(() => {
    if (!locations) return []
    const parentLookup = new Map<string, Location>()
    if (allLocations) {
      for (const loc of allLocations) {
        parentLookup.set(loc.id, loc)
      }
    }
    const result = new Map<string, Location>()
    for (const loc of locations) {
      if (loc.outline) {
        result.set(loc.id, loc)
      } else if (loc.parent_id && parentLookup.has(loc.parent_id)) {
        const parent = parentLookup.get(loc.parent_id)!
        if (parent.outline) {
          result.set(parent.id, parent)
        }
      }
    }
    return Array.from(result.values())
  }, [locations, allLocations])

  // Compute display markers (locations without outlines, and not inside parent outline)
  const displayMarkers = useMemo(() => {
    if (markers) return markers
    if (!locations) return []
    return getMapMarkers(locations, allLocations)
  }, [markers, locations, allLocations])

  // Combine visible locations for bounds and center calculation
  const allVisibleLocations = useMemo(() => {
    return [...outlines, ...displayMarkers.map((m) => m.location)]
  }, [outlines, displayMarkers])

  const initialCenter = useMemo(() => {
    return calculateMapCenter(allVisibleLocations, DDU_CAMPUS_CENTER)
  }, [allVisibleLocations])

  const tileConfig = useMemo(() => {
    return getTileLayerConfig(undefined, resolvedTheme)
  }, [resolvedTheme])

  // Effective coordinates for currently selected destination
  const destCoords = useMemo(() => {
    if (!selectedLocation) return null
    return getLocationEffectiveCoordinates(
      selectedLocation,
      allLocations || locations
    )
  }, [selectedLocation, allLocations, locations])

  return (
    <div
      data-testid="campus-map"
      className={`relative h-full w-full overflow-hidden ${className}`}
    >
      <MapContainer
        center={initialCenter}
        zoom={16}
        scrollWheelZoom
        className="h-full w-full z-0"
      >
        <TileLayer
          key={`tile-${resolvedTheme}`}
          attribution={tileConfig.attribution}
          url={tileConfig.url}
          subdomains={tileConfig.subdomains}
          maxZoom={tileConfig.maxZoom}
        />

        <MapBoundsController visibleLocations={allVisibleLocations} />
        <MapSelectionController
          selectedLocation={selectedLocation}
          markerRefs={markerRefs}
          polygonRefs={polygonRefs}
          allLocations={allLocations}
          isRoutingActive={isRoutingActive}
        />
        <MapRouteController
          isRoutingActive={isRoutingActive}
          userLocation={userLocation}
          destCoords={destCoords}
        />

        {/* Walking Route Polyline (Mockup Style: dashed blue path) */}
        {isRoutingActive && userLocation && destCoords && (
          <Polyline
            positions={[userLocation, [destCoords.lat, destCoords.lng]]}
            pathOptions={{
              color: "#2563eb",
              weight: 4,
              dashArray: "6, 10",
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}

        {/* Selected Destination Tooltip Badge (Mockup Style: [ Health Center ]) */}
        {selectedLocation && destCoords && (
          <Marker
            key={`selected-badge-${selectedLocation.id}`}
            position={[destCoords.lat, destCoords.lng]}
            icon={L.divIcon({
              className: "selected-dest-label",
              html: `<div class="bg-slate-900 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-xl border border-slate-700 whitespace-nowrap -translate-x-1/2 -translate-y-9 flex items-center gap-1.5 pointer-events-none select-none">
                <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                <span>${escapeHtml(selectedLocation.name)}</span>
              </div>`,
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            })}
            interactive={false}
          />
        )}

        {/* Building outlines */}
        {outlines.map((location) => {
          if (!location.outline) return null
          const isSelected =
            selectedLocation?.id === location.id ||
            selectedLocation?.parent_id === location.id
          const positions = geoJsonToLeafletPositions(location.outline)
          const style = getOutlineStyle(location.category?.name, isSelected, false)

          return (
            <Polygon
              key={`outline-${location.id}`}
              ref={(ref) => {
                if (ref) {
                  polygonRefs.current.set(location.id, ref)
                } else {
                  polygonRefs.current.delete(location.id)
                }
              }}
              positions={positions}
              pathOptions={{
                color: style.color,
                weight: isSelected ? 3.5 : style.weight,
                opacity: style.opacity,
                fillColor: style.fillColor,
                fillOpacity: style.fillOpacity,
                className: isSelected
                  ? "outline-selected-glow cursor-pointer"
                  : "cursor-pointer",
              }}
              eventHandlers={{
                click: () => onSelectLocation?.(location),
                mouseover: (e) => {
                  if (!isSelected) {
                    const layer = e.target as L.Polygon
                    layer.setStyle({
                      weight: style.weight + 1,
                      fillOpacity: Math.min(style.fillOpacity + 0.15, 0.9),
                    })
                  }
                },
                mouseout: (e) => {
                  if (!isSelected) {
                    const layer = e.target as L.Polygon
                    layer.setStyle({
                      weight: style.weight,
                      fillOpacity: style.fillOpacity,
                    })
                  }
                },
              }}
            >
              <Popup>
                <MapPopup location={location} />
              </Popup>
            </Polygon>
          )
        })}

        {/* Building code labels placed inside outlines */}
        <OutlineLabels outlines={outlines} />

        {/* Category-Colored Pins for standalone markers (Mockup style) */}
        {displayMarkers.map((marker) => {
          const isSelected = selectedLocation?.id === marker.id
          const pinIcon = createCategoryPinIcon(
            marker.location.category?.name,
            isSelected
          )

          return (
            <Marker
              key={`marker-${marker.id}`}
              position={marker.position}
              icon={pinIcon}
              title={marker.location.name}
              alt={marker.location.name}
              ref={(ref) => {
                if (ref) {
                  markerRefs.current.set(marker.id, ref)
                } else {
                  markerRefs.current.delete(marker.id)
                }
              }}
              eventHandlers={{
                click: () => onSelectLocation?.(marker.location),
              }}
            >
              <Popup>
                <MapPopup location={marker.location} />
              </Popup>
            </Marker>
          )
        })}

        {/* Floating Geolocation Control */}
        <LocateControl onLocationFound={onUserLocationChange} />
      </MapContainer>
    </div>
  )
}
