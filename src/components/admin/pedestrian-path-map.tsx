"use client"

import { useEffect, useMemo } from "react"
import L from "leaflet"
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet"
import "leaflet/dist/leaflet.css"
import type {
  LineString,
  Location,
  LocationEntrance,
  PedestrianPath,
  PedestrianPathType,
  PedestrianGraphNode,
} from "@/lib/types"
import { DDU_CAMPUS_CENTER } from "@/lib/map-utils"
import { geoJsonToLeafletPositions } from "@/lib/outline-utils"
import { getTileLayerConfig } from "@/lib/map-config"
import { useTheme } from "@/components/theme-provider"

interface PedestrianPathMapProps {
  paths: PedestrianPath[]
  locations: Location[]
  entrances: LocationEntrance[]
  graphNodes: PedestrianGraphNode[]
  selectedPathId: string | null
  draftGeometry: LineString
  draftType: PedestrianPathType
  wheelchairAccessible: boolean
  isDrawing: boolean
  isInserting: boolean
  isGeometryEditable: boolean
  onSelectPath: (id: string) => void
  onAddPoint: (point: [number, number]) => void
  onInsertPoint: (point: [number, number]) => void
  onMovePoint: (index: number, point: [number, number]) => void
}

function MapClickHandler({
  enabled,
  inserting,
  onPoint,
  onInsert,
}: {
  enabled: boolean
  inserting: boolean
  onPoint: (point: [number, number]) => void
  onInsert: (point: [number, number]) => void
}) {
  useMapEvents({
    click(event) {
      if (enabled) onPoint([event.latlng.lng, event.latlng.lat])
      else if (inserting) onInsert([event.latlng.lng, event.latlng.lat])
    },
  })
  return null
}

function KeepMapInCampusView({ locations }: { locations: Location[] }) {
  const map = useMap()
  useEffect(() => {
    const points: L.LatLngExpression[] = []
    for (const location of locations) {
      if (location.lat != null && location.lng != null) {
        points.push([location.lat, location.lng])
      }
    }
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [24, 24], maxZoom: 18 })
    }
  }, [locations, map])
  return null
}

function editVertexIcon() {
  return L.divIcon({
    className: "!bg-transparent !border-0",
    html: '<span style="display:block;width:16px;height:16px;border-radius:50%;background:#fff;border:3px solid #2563eb;box-shadow:0 1px 5px #0008"></span>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

function PathLine({
  path,
  onSelect,
}: {
  path: PedestrianPath
  onSelect?: () => void
}) {
  const positions = path.geometry.coordinates.map(
    ([lng, lat]) => [lat, lng] as [number, number]
  )
  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color: path.is_active ? "#64748b" : "#a1a1aa",
        weight: 3,
        opacity: 0.7,
        dashArray: path.is_active ? undefined : "5 7",
      }}
      eventHandlers={
        onSelect
          ? {
              click(event) {
                event.originalEvent.stopPropagation()
                onSelect()
              },
            }
          : undefined
      }
    />
  )
}

export default function PedestrianPathMap({
  paths,
  locations,
  entrances,
  graphNodes,
  selectedPathId,
  draftGeometry,
  draftType,
  wheelchairAccessible,
  isDrawing,
  isInserting,
  isGeometryEditable,
  onSelectPath,
  onAddPoint,
  onInsertPoint,
  onMovePoint,
}: PedestrianPathMapProps) {
  const { resolvedTheme: theme } = useTheme()
  const tileConfig = useMemo(() => getTileLayerConfig(undefined, theme), [theme])
  const center = useMemo<[number, number]>(() => DDU_CAMPUS_CENTER, [])
  const draftPositions = draftGeometry.coordinates.map(
    ([lng, lat]) => [lat, lng] as [number, number]
  )

  return (
    <div
      className="h-[26rem] overflow-hidden rounded-md border border-border"
      data-testid="pedestrian-path-map"
    >
      <MapContainer
        center={center}
        zoom={17}
        scrollWheelZoom
        className="z-0 h-full w-full"
      >
        <TileLayer
          url={tileConfig.url}
          subdomains={tileConfig.subdomains}
          maxZoom={tileConfig.maxZoom}
          attribution={tileConfig.attribution}
        />
        <KeepMapInCampusView locations={locations} />
        <MapClickHandler enabled={isDrawing} inserting={isInserting} onPoint={onAddPoint} onInsert={onInsertPoint} />

        {locations.map((location) => {
          if (!location.outline) return null
          return (
            <Polygon
              key={`reference-outline-${location.id}`}
              positions={geoJsonToLeafletPositions(location.outline)}
              pathOptions={{
                color: "#64748b",
                weight: 1.5,
                opacity: 0.65,
                fillColor: "#94a3b8",
                fillOpacity: 0.08,
              }}
              interactive={false}
            />
          )
        })}

        {entrances.map((entrance) => (
          <CircleMarker
            key={`reference-entrance-${entrance.id}`}
            center={[entrance.lat, entrance.lng]}
            radius={5}
            pathOptions={{
              color: "#fff",
              weight: 2,
              fillColor: "#7c3aed",
              fillOpacity: 1,
            }}
            interactive={false}
          />
        ))}
        {graphNodes.filter((node) => node.kind === "junction").map((node) => (
          <CircleMarker
            key={`graph-node-${node.id}`}
            center={[node.lat, node.lng]}
            radius={7}
            pathOptions={{ color: "#fff", weight: 2, fillColor: "#0891b2", fillOpacity: 1 }}
            interactive={false}
          />
        ))}

        {paths
          .filter((path) => path.id !== selectedPathId)
          .map((path) => (
          <PathLine
            key={`reference-path-${path.id}`}
            path={path}
            onSelect={() => onSelectPath(path.id)}
          />
          ))}

        {draftPositions.length > 1 && (
          <Polyline
            positions={draftPositions}
            pathOptions={{
              color: wheelchairAccessible ? "#059669" : "#d97706",
              weight: 5,
              opacity: 0.95,
              dashArray: draftType === "stairs" ? "8 6" : undefined,
            }}
          />
        )}
        {draftPositions.map((point, index) => (
          <Marker
            key={`draft-path-point-${index}`}
            position={point}
            icon={editVertexIcon()}
            draggable={isGeometryEditable}
            eventHandlers={{
              dragend(event) {
                const moved = (event.target as L.Marker).getLatLng()
                onMovePoint(index, [moved.lng, moved.lat])
              },
              click(event) {
                event.originalEvent.stopPropagation()
              },
            }}
          />
        ))}
        {isDrawing && draftPositions.length > 0 && (
          <CircleMarker
            center={draftPositions[draftPositions.length - 1]}
            radius={8}
            pathOptions={{
              color: "#fff",
              weight: 2,
              fillColor: "#2563eb",
              fillOpacity: 1,
            }}
            interactive={false}
          />
        )}
      </MapContainer>
    </div>
  )
}
