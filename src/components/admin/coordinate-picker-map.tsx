"use client"

import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet"
import { useEffect } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { DDU_CAMPUS_CENTER } from "@/lib/map-utils"
import { fixLeafletDefaultIcon } from "@/lib/leaflet-fix"

fixLeafletDefaultIcon()

type Coordinates = [number, number] | null

function ClickToSet({
  onChange,
}: {
  onChange: (point: [number, number]) => void
}) {
  useMapEvents({
    click(event) {
      onChange([event.latlng.lat, event.latlng.lng])
    },
  })
  return null
}

function KeepPositionVisible({ value }: { value: Coordinates }) {
  const map = useMap()
  const hasValue = value !== null
  const latitude = value?.[0] ?? DDU_CAMPUS_CENTER[0]
  const longitude = value?.[1] ?? DDU_CAMPUS_CENTER[1]
  useEffect(() => {
    map.setView(
      [latitude, longitude],
      hasValue ? Math.max(map.getZoom(), 17) : 16,
      { animate: false }
    )
  }, [map, latitude, longitude, hasValue])
  return null
}

export default function CoordinatePickerMap({
  value,
  onChange,
}: {
  value: Coordinates
  onChange: (point: [number, number]) => void
}) {
  const position = value ?? DDU_CAMPUS_CENTER
  return (
    <div
      className="h-56 overflow-hidden rounded-md border border-border"
      data-testid="coordinate-picker-map"
    >
      <MapContainer
        center={position}
        zoom={value ? 17 : 16}
        scrollWheelZoom
        className="z-0 h-full w-full"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        <KeepPositionVisible value={value} />
        <ClickToSet onChange={onChange} />
        {value && (
          <Marker
            position={value}
            draggable
            eventHandlers={{
              dragend(event) {
                const marker = event.target as L.Marker
                const point = marker.getLatLng()
                onChange([point.lat, point.lng])
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  )
}
