"use client"

import { useEffect, useMemo, useRef } from "react"
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet"
import type L from "leaflet"
import "leaflet/dist/leaflet.css"

import type { Location } from "@/lib/types"
import type { MapMarker } from "@/lib/map-utils"
import {
  calculateMapBounds,
  calculateMapCenter,
  DDU_CAMPUS_CENTER,
} from "@/lib/map-utils"
import { fixLeafletDefaultIcon } from "@/lib/leaflet-fix"
import { MapPopup } from "@/components/map-popup"

fixLeafletDefaultIcon()

interface MapBoundsControllerProps {
  markers: MapMarker[]
}

function MapBoundsController({ markers }: MapBoundsControllerProps) {
  const map = useMap()
  const previousMarkersCountRef = useRef<number | null>(null)

  useEffect(() => {
    // Only adjust bounds if the markers array changed
    if (markers.length === 0) {
      if (previousMarkersCountRef.current !== 0) {
        map.setView(DDU_CAMPUS_CENTER, 16)
        previousMarkersCountRef.current = 0
      }
      return
    }

    const locations = markers.map((m) => m.location)
    const bounds = calculateMapBounds(locations)
    if (bounds) {
      map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 18,
      })
    }
    previousMarkersCountRef.current = markers.length
  }, [map, markers])

  return null
}

interface MapSelectionControllerProps {
  selectedLocation: Location | null
  markerRefs: React.RefObject<Map<string, L.Marker>>
}

function MapSelectionController({
  selectedLocation,
  markerRefs,
}: MapSelectionControllerProps) {
  const map = useMap()

  useEffect(() => {
    if (
      !selectedLocation ||
      selectedLocation.lat == null ||
      selectedLocation.lng == null
    ) {
      return
    }

    const targetPos: [number, number] = [
      selectedLocation.lat,
      selectedLocation.lng,
    ]

    map.setView(targetPos, Math.max(map.getZoom(), 17), { animate: true })

    const marker = markerRefs.current?.get(selectedLocation.id)
    if (marker) {
      marker.openPopup()
    }
  }, [map, selectedLocation, markerRefs])

  return null
}

export interface CampusMapProps {
  markers: MapMarker[]
  selectedLocation: Location | null
  onSelectLocation?: (location: Location) => void
  className?: string
}

export default function CampusMap({
  markers,
  selectedLocation,
  onSelectLocation,
  className = "",
}: CampusMapProps) {
  useEffect(() => {
    fixLeafletDefaultIcon()
  }, [])

  const markerRefs = useRef<Map<string, L.Marker>>(new Map())

  const initialCenter = useMemo(() => {
    const locations = markers.map((m) => m.location)
    return calculateMapCenter(locations, DDU_CAMPUS_CENTER)
  }, [markers])

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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsController markers={markers} />
        <MapSelectionController
          selectedLocation={selectedLocation}
          markerRefs={markerRefs}
        />

        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={marker.position}
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
        ))}
      </MapContainer>
    </div>
  )
}
