"use client"

import { useEffect, useState } from "react"
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  useMapEvents,
  useMap,
} from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type {
  Category,
  LocationEntrance,
  Position,
  Polygon as PolygonGeometry,
} from "@/lib/types"
import type { BuildingGeometry, PolygonPart } from "@/lib/building-map-utils"
import { getPolygonParts } from "@/lib/building-map-utils"
import { DDU_CAMPUS_CENTER } from "@/lib/map-utils"
import { calculateOutlineCenter } from "@/lib/validations/outline"
import {
  getCategoryColors,
  getOutlineStyle,
  geoJsonToLeafletPositions,
} from "@/lib/outline-utils"
import { fixLeafletDefaultIcon } from "@/lib/leaflet-fix"

fixLeafletDefaultIcon()

export type EditorMode = "draw" | "edit" | "entrance" | null

function MapInput({
  mode,
  onPoint,
}: {
  mode: EditorMode
  onPoint: (point: [number, number]) => void
}) {
  useMapEvents({
    click(event) {
      if (mode === "draw" || mode === "entrance")
        onPoint([event.latlng.lat, event.latlng.lng])
    },
  })
  return null
}

function KeepLocationVisible({
  latitude,
  longitude,
}: {
  latitude: number | null
  longitude: number | null
}) {
  const map = useMap()
  useEffect(() => {
    if (latitude == null || longitude == null) return
    map.setView([latitude, longitude], Math.max(map.getZoom(), 17), {
      animate: false,
    })
  }, [map, latitude, longitude])
  return null
}

function vertexIcon() {
  return L.divIcon({
    className: "!bg-transparent !border-0",
    html: '<span style="display:block;width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid #2563eb;box-shadow:0 1px 5px #0008"></span>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

function entranceIcon(unsaved: boolean) {
  const color = unsaved ? "#d97706" : "#059669"
  return L.divIcon({
    className: "!bg-transparent !border-0",
    html: `<span style="display:flex;width:28px;height:28px;align-items:center;justify-content:center;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid white;color:white;box-shadow:0 1px 5px #0008"><span style="transform:rotate(45deg);font:bold 13px sans-serif">E</span></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  })
}

export default function BuildingMapCanvas({
  outline,
  outlineDirty,
  category,
  mode,
  drawingRing,
  entrances,
  unsavedEntranceIds,
  latitude,
  longitude,
  selectedPolygon,
  onMapPoint,
  onSelectPolygon,
  onVertexMove,
  onEntranceMove,
}: {
  outline: BuildingGeometry | null
  outlineDirty: boolean
  category?: Category | null
  mode: EditorMode
  drawingRing: Position[]
  entrances: LocationEntrance[]
  unsavedEntranceIds: Set<string>
  latitude: number | null
  longitude: number | null
  selectedPolygon: number
  onMapPoint: (point: [number, number]) => void
  onSelectPolygon: (index: number) => void
  onVertexMove: (
    polygonIndex: number,
    ringIndex: number,
    vertexIndex: number,
    point: Position
  ) => void
  onEntranceMove: (id: string, point: [number, number]) => void
}) {
  const parts = getPolygonParts(outline)
  const [initialCenter] = useState(() => {
    if (outline) return calculateOutlineCenter(outline)
    if (latitude != null && longitude != null)
      return { lat: latitude, lng: longitude }
    return { lat: DDU_CAMPUS_CENTER[0], lng: DDU_CAMPUS_CENTER[1] }
  })
  const outlineStyle = getOutlineStyle(category, false, false)
  const selectedStroke = getCategoryColors(category).strokeSelected
  const drawingLatLngs = drawingRing.map(
    ([lng, lat]) => [lat, lng] as [number, number]
  )

  return (
    <div
      className="h-[24rem] overflow-hidden rounded-md border border-border"
      data-testid="building-map-editor"
    >
      <MapContainer
        center={[initialCenter.lat, initialCenter.lng]}
        zoom={18}
        scrollWheelZoom
        doubleClickZoom={!mode}
        className="z-0 h-full w-full"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        <MapInput mode={mode} onPoint={onMapPoint} />
        <KeepLocationVisible latitude={latitude} longitude={longitude} />
        {parts.map((part: PolygonPart, polygonIndex) => {
          const geometry: PolygonGeometry = {
            type: "Polygon",
            coordinates: part,
          }
          const positions = geoJsonToLeafletPositions(geometry)
          return (
            <Polygon
              key={`area-${polygonIndex}`}
              positions={positions}
              pathOptions={{
                color:
                  mode === "edit" && selectedPolygon === polygonIndex
                    ? selectedStroke
                    : outlineStyle.color,
                weight:
                  mode === "edit" && selectedPolygon === polygonIndex
                    ? 3
                    : outlineStyle.weight,
                opacity: outlineStyle.opacity,
                fillColor: outlineStyle.fillColor,
                fillOpacity: outlineStyle.fillOpacity,
                dashArray: outlineDirty ? "6 5" : undefined,
              }}
              eventHandlers={{
                click(event) {
                  if (mode === "edit") {
                    event.originalEvent.stopPropagation()
                    onSelectPolygon(polygonIndex)
                  }
                },
              }}
            />
          )
        })}
        {mode === "edit" &&
          parts[selectedPolygon]?.map((ring, ringIndex) =>
            ring.slice(0, -1).map((position, vertexIndex) => (
              <Marker
                key={`vertex-${selectedPolygon}-${ringIndex}-${vertexIndex}`}
                position={[position[1], position[0]]}
                icon={vertexIcon()}
                draggable
                eventHandlers={{
                  dragend(event) {
                    const point = (event.target as L.Marker).getLatLng()
                    onVertexMove(selectedPolygon, ringIndex, vertexIndex, [
                      point.lng,
                      point.lat,
                    ])
                  },
                  click(event) {
                    event.originalEvent.stopPropagation()
                  },
                }}
              />
            ))
          )}
        {drawingLatLngs.length > 0 && (
          <Polyline
            positions={drawingLatLngs}
            pathOptions={{ color: "#2563eb", weight: 3, dashArray: "5 5" }}
          />
        )}
        {drawingLatLngs.map((point, index) => (
          <CircleMarker
            key={`draft-${index}`}
            center={point}
            radius={5}
            pathOptions={{
              color: "white",
              weight: 2,
              fillColor: "#2563eb",
              fillOpacity: 1,
            }}
            eventHandlers={{
              click(event) {
                event.originalEvent.stopPropagation()
              },
            }}
          />
        ))}
        {entrances.map((entrance) => (
          <Marker
            key={`entrance-${entrance.id}`}
            position={[entrance.lat, entrance.lng]}
            icon={entranceIcon(unsavedEntranceIds.has(entrance.id))}
            draggable={mode === "entrance"}
            eventHandlers={{
              dragend(event) {
                const point = (event.target as L.Marker).getLatLng()
                onEntranceMove(entrance.id, [point.lat, point.lng])
              },
              click(event) {
                event.originalEvent.stopPropagation()
              },
            }}
          />
        ))}
      </MapContainer>
    </div>
  )
}
