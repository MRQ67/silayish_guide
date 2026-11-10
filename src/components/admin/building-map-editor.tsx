"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import type {
  Category,
  LocationEntrance,
  Polygon,
  MultiPolygon,
} from "@/lib/types"
import type { BuildingGeometry } from "@/lib/building-map-utils"
import {
  appendPolygonPart,
  getPolygonParts,
  movePolygonVertex,
  removePolygonPart,
} from "@/lib/building-map-utils"
import {
  MAX_OUTLINE_POSITIONS,
  validateOutline,
} from "@/lib/validations/outline"
import { Button } from "@/components/ui/button"
import { saveLocationEntrancesAction } from "@/app/admin/entrance-actions"
import dynamic from "next/dynamic"
import type { EditorMode } from "@/components/admin/building-map-editor-map"

const BuildingMapCanvas = dynamic(
  () => import("@/components/admin/building-map-editor-map"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[24rem] animate-pulse rounded-md border border-border bg-muted/50" />
    ),
  }
)

export interface BuildingMapEditorProps {
  locationId?: string
  isBuilding: boolean
  category?: Category | null
  latitude: number | null
  longitude: number | null
  savedOutline: Polygon | MultiPolygon | null
  outline: Polygon | MultiPolygon | null
  outlineError?: string | null
  onOutlineChange: (outline: BuildingGeometry | null) => void
  initialEntrances?: LocationEntrance[]
  onEntrancesDirtyChange?: (dirty: boolean) => void
}

function sortEntrances(entrances: LocationEntrance[]) {
  return [...entrances].sort((a, b) => a.id.localeCompare(b.id))
}

export function BuildingMapEditor({
  locationId,
  isBuilding,
  category,
  latitude,
  longitude,
  savedOutline,
  outline,
  outlineError,
  onOutlineChange,
  initialEntrances = [],
  onEntrancesDirtyChange,
}: BuildingMapEditorProps) {
  const [mode, setMode] = useState<EditorMode>(null)
  const [drawingRing, setDrawingRing] = useState<number[][]>([])
  const [selectedPolygon, setSelectedPolygon] = useState(0)
  const [entrances, setEntrances] =
    useState<LocationEntrance[]>(initialEntrances)
  const [savedEntrances, setSavedEntrances] =
    useState<LocationEntrance[]>(initialEntrances)
  const [entranceError, setEntranceError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const polygonParts = getPolygonParts(outline)
  const outlineDirty = JSON.stringify(outline) !== JSON.stringify(savedOutline)
  const entrancesDirty =
    JSON.stringify(sortEntrances(entrances)) !==
    JSON.stringify(sortEntrances(savedEntrances))

  useEffect(() => {
    onEntrancesDirtyChange?.(entrancesDirty)
  }, [entrancesDirty, onEntrancesDirtyChange])

  const unsavedEntranceIds = useMemo(() => {
    const savedById = new Map(
      savedEntrances.map((entrance) => [entrance.id, entrance])
    )
    return new Set(
      entrances
        .filter(
          (entrance) =>
            JSON.stringify(entrance) !==
            JSON.stringify(savedById.get(entrance.id))
        )
        .map((entrance) => entrance.id)
    )
  }, [entrances, savedEntrances])

  function finishDrawing() {
    const validation = validateOutline({
      type: "Polygon",
      coordinates: [[...drawingRing, drawingRing[0]]],
    })
    if (!validation.valid || !validation.geometry) {
      setEntranceError(
        validation.error || "Add at least three valid points to draw an area."
      )
      return
    }
    const next = appendPolygonPart(outline, drawingRing)
    const result = validateOutline(
      next,
      latitude != null && longitude != null
        ? { lat: latitude, lng: longitude }
        : undefined
    )
    if (!result.valid) {
      setEntranceError(result.error || "The outline is invalid.")
      return
    }
    onOutlineChange(result.geometry ?? null)
    setSelectedPolygon(Math.max(0, polygonParts.length))
    setDrawingRing([])
    setEntranceError(null)
    setMode(null)
  }

  function handleVertexMove(
    polygonIndex: number,
    ringIndex: number,
    vertexIndex: number,
    position: number[]
  ) {
    if (!outline) return
    const next = movePolygonVertex(
      outline,
      polygonIndex,
      ringIndex,
      vertexIndex,
      position
    )
    const result = validateOutline(
      next,
      latitude != null && longitude != null
        ? { lat: latitude, lng: longitude }
        : undefined
    )
    if (!result.valid) {
      setEntranceError(result.error || "The outline is invalid.")
      return
    }
    onOutlineChange(result.geometry ?? null)
    setEntranceError(null)
  }

  function saveEntrances() {
    if (!locationId || !isBuilding) return
    const submittedEntrances = entrances.map((entrance) => ({ ...entrance }))
    setEntranceError(null)
    startTransition(async () => {
      const result = await saveLocationEntrancesAction(
        locationId,
        submittedEntrances
      )
      if (!result.success) {
        setEntranceError(
          Object.values(result.fieldErrors ?? {}).flat()[0] ||
            result.error ||
            "Unable to save entrances."
        )
        return
      }
      setSavedEntrances(submittedEntrances)
    })
  }

  return (
    <section
      className="space-y-4 rounded-lg border border-border p-4 sm:col-span-2"
      aria-label="Building map editor"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Building footprint and entrances
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Draw or adjust the footprint. Entrance placement has its own map
            mode so it cannot change the outline.
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${outlineDirty || entrancesDirty ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"}`}
        >
          {outlineDirty || entrancesDirty
            ? "Unsaved map changes"
            : "Saved map data"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "draw" ? "default" : "outline"}
          onClick={() => {
            setMode(mode === "draw" ? null : "draw")
            setDrawingRing([])
            setEntranceError(null)
          }}
        >
          Draw area
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "edit" ? "default" : "outline"}
          disabled={!outline}
          onClick={() => {
            setMode(mode === "edit" ? null : "edit")
            setSelectedPolygon(
              Math.min(selectedPolygon, Math.max(0, polygonParts.length - 1))
            )
            setDrawingRing([])
            setEntranceError(null)
          }}
        >
          Edit vertices
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "entrance" ? "default" : "outline"}
          disabled={!locationId || !isBuilding}
          onClick={() => {
            setMode(mode === "entrance" ? null : "entrance")
            setDrawingRing([])
            setEntranceError(null)
          }}
        >
          Add entrance
        </Button>
        {mode === "draw" && (
          <Button
            type="button"
            size="sm"
            onClick={finishDrawing}
            disabled={drawingRing.length < 3}
          >
            Finish polygon
          </Button>
        )}
        {mode === "edit" && outline && polygonParts.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              onOutlineChange(removePolygonPart(outline, selectedPolygon))
              setSelectedPolygon(0)
              setEntranceError(null)
            }}
          >
            Delete selected area
          </Button>
        )}
        {mode && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setMode(null)
              setDrawingRing([])
              setEntranceError(null)
            }}
          >
            Cancel current action
          </Button>
        )}
        {outline && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              onOutlineChange(null)
              setMode(null)
              setDrawingRing([])
              setEntranceError(null)
            }}
          >
            Clear outline
          </Button>
        )}
        {outlineDirty && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              onOutlineChange(savedOutline)
              setMode(null)
              setDrawingRing([])
              setEntranceError(null)
            }}
          >
            Discard outline edits
          </Button>
        )}
      </div>

      {mode === "draw" && (
        <p className="text-xs text-primary">
          Click the map to add vertices, then choose Finish polygon. Draw
          additional areas to create a MultiPolygon.
        </p>
      )}
      {mode === "edit" && (
        <p className="text-xs text-primary">
          Select an area, then drag its vertex handles. Use Delete selected area
          to remove one MultiPolygon part.
        </p>
      )}
      {mode === "entrance" && (
        <p className="text-xs text-primary">
          Click the map to add an entrance marker. Drag markers in this mode to
          move them.
        </p>
      )}

      <BuildingMapCanvas
        outline={outline}
        outlineDirty={outlineDirty}
        category={category}
        mode={mode}
        drawingRing={drawingRing}
        entrances={entrances}
        unsavedEntranceIds={unsavedEntranceIds}
        latitude={latitude}
        longitude={longitude}
        selectedPolygon={selectedPolygon}
        onMapPoint={(point) => {
          if (mode === "draw") {
            if (drawingRing.length >= MAX_OUTLINE_POSITIONS - 1) {
              setEntranceError(
                `An outline cannot exceed ${MAX_OUTLINE_POSITIONS} positions.`
              )
              return
            }
            setDrawingRing((current) => [...current, [point[1], point[0]]])
          } else if (mode === "entrance") {
            if (!locationId || !isBuilding) return
            if (entrances.length >= 100) {
              setEntranceError("A building can have at most 100 entrances.")
              return
            }
            setEntrances((current) => [
              ...current,
              {
                id: crypto.randomUUID(),
                location_id: locationId!,
                name: "",
                lat: point[0],
                lng: point[1],
                accessibility: null,
                created_at: new Date().toISOString(),
              },
            ])
          }
        }}
        onSelectPolygon={setSelectedPolygon}
        onVertexMove={handleVertexMove}
        onEntranceMove={(id, point) =>
          setEntrances((current) =>
            current.map((entrance) =>
              entrance.id === id
                ? { ...entrance, lat: point[0], lng: point[1] }
                : entrance
            )
          )
        }
      />

      {outlineError && (
        <p role="alert" className="text-xs text-destructive">
          {outlineError}
        </p>
      )}
      {entranceError && (
        <p role="alert" className="text-xs text-destructive">
          {entranceError}
        </p>
      )}

      {!locationId && (
        <p className="text-xs text-muted-foreground">
          Save this location as a building before adding named entrances.
        </p>
      )}
      {locationId && !isBuilding && entrances.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Change the location type to Building to manage entrances.
        </p>
      )}

      {locationId && (isBuilding || entrances.length > 0) && (
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-medium">
              Named entrances ({entrances.length})
            </h4>
            <div className="flex gap-2">
              {entrancesDirty && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => {
                    setEntrances(
                      savedEntrances.map((entrance) => ({ ...entrance }))
                    )
                    setEntranceError(null)
                  }}
                >
                  Discard entrance edits
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                disabled={!entrancesDirty || isPending}
                onClick={saveEntrances}
              >
                {isPending ? "Saving…" : "Save entrances"}
              </Button>
            </div>
          </div>
          {entrances.map((entrance, index) => (
            <div
              key={entrance.id}
              className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[minmax(10rem,1fr)_minmax(12rem,1.5fr)_auto]"
            >
              <label className="text-xs font-medium">
                Name
                <input
                  aria-label={`Entrance ${index + 1} name`}
                  maxLength={80}
                  value={entrance.name}
                  onChange={(event) =>
                    setEntrances((current) =>
                      current.map((item) =>
                        item.id === entrance.id
                          ? { ...item, name: event.target.value }
                          : item
                      )
                    )
                  }
                  className="mt-1 block w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-medium">
                Accessibility notes
                <input
                  aria-label={`Entrance ${index + 1} accessibility notes`}
                  maxLength={250}
                  value={entrance.accessibility ?? ""}
                  onChange={(event) =>
                    setEntrances((current) =>
                      current.map((item) =>
                        item.id === entrance.id
                          ? {
                              ...item,
                              accessibility: event.target.value || null,
                            }
                          : item
                      )
                    )
                  }
                  placeholder="Step-free, ramp access…"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm"
                />
              </label>
              <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end sm:justify-center">
                <span className="text-xs text-muted-foreground">
                  {entrance.lat.toFixed(5)}, {entrance.lng.toFixed(5)}
                  {unsavedEntranceIds.has(entrance.id)
                    ? " · Unsaved"
                    : " · Saved"}
                </span>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() =>
                    setEntrances((current) =>
                      current.filter((item) => item.id !== entrance.id)
                    )
                  }
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
