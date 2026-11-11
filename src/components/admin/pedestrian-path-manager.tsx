"use client"

import dynamic from "next/dynamic"
import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import type {
  LineString,
  Location,
  LocationEntrance,
  PedestrianPath,
  PedestrianPathType,
  PedestrianGraphNode,
  PedestrianPathConnection,
} from "@/lib/types"
import { diagnosePedestrianGraph } from "@/lib/pedestrian-graph-utils"
import {
  pedestrianPathSchema,
  type PedestrianPathFormData,
} from "@/lib/validations/pedestrian-path"
import {
  deletePedestrianPathAction,
  linkPathVertexAction,
  unlinkPathVertexAction,
  savePedestrianPathAction,
} from "@/app/admin/pedestrian-path-actions"

const PedestrianPathMap = dynamic(
  () => import("@/components/admin/pedestrian-path-map"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[26rem] animate-pulse rounded-md border border-border bg-muted/50" />
    ),
  }
)

const PATH_TYPE_LABELS: Record<PedestrianPathType, string> = {
  walkway: "Walkway",
  ramp: "Ramp",
  stairs: "Stairs",
  other: "Other",
}

function makeEmptyDraft(): PedestrianPathFormData {
  return {
    name: "",
    geometry: { type: "LineString", coordinates: [] },
    path_type: "walkway",
    wheelchair_accessible: false,
    surface: null,
    notes: null,
    is_active: true,
  }
}

function cloneLineString(
  line: LineString
): PedestrianPathFormData["geometry"] {
  return {
    type: "LineString",
    coordinates: line.coordinates.map(
      ([lng, lat]) => [lng, lat] as [number, number]
    ),
  }
}

export interface PedestrianPathManagerProps {
  initialPaths: PedestrianPath[]
  locations: Location[]
  entrances: LocationEntrance[]
  graphNodes: PedestrianGraphNode[]
  connections: PedestrianPathConnection[]
}

export function PedestrianPathManager({
  initialPaths,
  locations,
  entrances,
  graphNodes,
  connections,
}: PedestrianPathManagerProps) {
  const [paths, setPaths] = useState(initialPaths)
  const [draft, setDraft] = useState<PedestrianPathFormData | null>(null)
  const [originalGeometry, setOriginalGeometry] = useState<LineString | null>(
    null
  )
  const [isDrawing, setIsDrawing] = useState(false)
  const [isInserting, setIsInserting] = useState(false)
  const [isGeometryEditable, setIsGeometryEditable] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PedestrianPath | null>(
    null
  )
  const [isPending, startTransition] = useTransition()

  const selectedPathId = draft?.id ?? null
  const graphDiagnostics = diagnosePedestrianGraph(paths, entrances, graphNodes, connections)

  async function linkVertex(index: number, target: { kind: "junction"; nodeId?: string } | { kind: "entrance"; entranceId: string }) {
    if (!draft?.id) {
      setFormMessage("Save this path before adding graph connections.")
      return
    }
    const result = await linkPathVertexAction(draft.id, index, target)
    setFormMessage(result.error ?? "Connection saved. Reloading graph status…")
    if (result.success) window.location.reload()
  }

  async function unlinkVertex(index: number) {
    if (!draft?.id) return
    const result = await unlinkPathVertexAction(draft.id, index)
    setFormMessage(result.error ?? "Connection removed. Reloading graph status…")
    if (result.success) window.location.reload()
  }

  function beginNewPath() {
    setDraft(makeEmptyDraft())
    setOriginalGeometry(null)
    setIsDrawing(true)
    setIsGeometryEditable(true)
    setErrors({})
    setFormMessage(null)
  }

  function selectPath(path: PedestrianPath) {
    setDraft({
      id: path.id,
      name: path.name,
      geometry: cloneLineString(path.geometry),
      path_type: path.path_type,
      wheelchair_accessible: path.wheelchair_accessible,
      surface: path.surface,
      notes: path.notes,
      is_active: path.is_active,
    })
    setOriginalGeometry(cloneLineString(path.geometry))
    setIsDrawing(false)
    setIsGeometryEditable(false)
    setErrors({})
    setFormMessage(null)
  }

  function updateDraft<K extends keyof PedestrianPathFormData>(
    key: K,
    value: PedestrianPathFormData[K]
  ) {
    setDraft((current) => (current ? { ...current, [key]: value } : current))
    setErrors((current) => ({ ...current, [key]: [] }))
    setFormMessage(null)
  }

  function addPoint(point: [number, number]) {
    setDraft((current) => {
      if (!current) return current
      if (current.geometry.coordinates.length >= 500) {
        setErrors((previous) => ({
          ...previous,
          geometry: ["A path cannot exceed 500 points."],
        }))
        return current
      }
      return {
        ...current,
        geometry: {
          ...current.geometry,
          coordinates: [...current.geometry.coordinates, point],
        },
      }
    })
    setErrors((current) => ({ ...current, geometry: [] }))
  }

  function movePoint(index: number, point: [number, number]) {
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        geometry: {
          ...current.geometry,
          coordinates: current.geometry.coordinates.map((position, i) =>
            i === index ? point : position
          ),
        },
      }
    })
    setErrors((current) => ({ ...current, geometry: [] }))
  }

  function removePoint(index: number) {
    setDraft((current) =>
      current
        ? {
            ...current,
            geometry: {
              ...current.geometry,
              coordinates: current.geometry.coordinates.filter(
                (_, i) => i !== index
              ),
            },
          }
        : current
    )
  }

  function insertPoint(point: [number, number]) {
    setDraft((current) => {
      if (!current || current.geometry.coordinates.length < 2) return current
      if (current.geometry.coordinates.length >= 500) {
        setErrors((previous) => ({ ...previous, geometry: ["A path cannot exceed 500 points."] }))
        return current
      }
      const [lng, lat] = point
      let bestIndex = 1
      let bestDistance = Number.POSITIVE_INFINITY
      for (let index = 0; index < current.geometry.coordinates.length - 1; index++) {
        const [x1, y1] = current.geometry.coordinates[index]
        const [x2, y2] = current.geometry.coordinates[index + 1]
        const dx = x2 - x1, dy = y2 - y1
        const lengthSquared = dx * dx + dy * dy
        const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((lng - x1) * dx + (lat - y1) * dy) / lengthSquared))
        const distance = (lng - (x1 + t * dx)) ** 2 + (lat - (y1 + t * dy)) ** 2
        if (distance < bestDistance) { bestDistance = distance; bestIndex = index + 1 }
      }
      const coordinates = [...current.geometry.coordinates]
      coordinates.splice(bestIndex, 0, point)
      return { ...current, geometry: { ...current.geometry, coordinates } }
    })
    setIsInserting(false)
  }

  function savePath() {
    if (!draft) return
    const parsed = pedestrianPathSchema.safeParse(draft)
    if (!parsed.success) {
      const nextErrors: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "form")
        nextErrors[field] = [...(nextErrors[field] ?? []), issue.message]
      }
      setErrors(nextErrors)
      setFormMessage("Please fix the highlighted path details before saving.")
      return
    }

    setErrors({})
    setFormMessage(null)
    startTransition(async () => {
      const result = await savePedestrianPathAction(parsed.data)
      if (!result.success || !result.data) {
        setErrors(result.fieldErrors ?? {})
        setFormMessage(result.error ?? "Unable to save this path.")
        return
      }

      setPaths((current) => {
        const next = current.filter((path) => path.id !== result.data!.id)
        return [...next, result.data!].sort((a, b) => a.name.localeCompare(b.name))
      })
      selectPath(result.data)
      setFormMessage("Path saved.")
    })
  }

  function deletePath() {
    if (!pendingDelete) return
    const path = pendingDelete
    startTransition(async () => {
      const result = await deletePedestrianPathAction(path.id)
      if (!result.success) {
        setFormMessage(result.error ?? "Unable to delete this path.")
        setPendingDelete(null)
        return
      }
      setPaths((current) => current.filter((item) => item.id !== path.id))
      if (draft?.id === path.id) {
        setDraft(null)
        setOriginalGeometry(null)
      }
      setPendingDelete(null)
      setFormMessage("Path deleted.")
    })
  }

  const fieldError = (field: string) => errors[field]?.[0]

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(16rem,0.75fr)_minmax(0,1.5fr)]">
      <section className="space-y-4" aria-label="Pedestrian path list">
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3" aria-label="Connectivity validation">
          <h2 className="text-sm font-semibold">Connectivity checks</h2>
          <p className="mt-1 text-xs text-muted-foreground">Explicit links only. Nearby paths and crossings are not considered connected.</p>
          <p className="mt-2 text-xs">{graphDiagnostics.length === 0 ? "No missing endpoint or entrance links detected." : `${graphDiagnostics.length} connectivity issue${graphDiagnostics.length === 1 ? "" : "s"} found.`}</p>
          {graphDiagnostics.length > 0 && <ul className="mt-2 max-h-36 space-y-1 overflow-auto text-xs text-amber-900 dark:text-amber-200">{graphDiagnostics.map((item) => <li key={item.id}>{item.message}</li>)}</ul>}
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Campus paths</h2>
            <p className="text-xs text-muted-foreground">
              {paths.length} {paths.length === 1 ? "path" : "paths"}
            </p>
          </div>
          <Button type="button" size="sm" onClick={beginNewPath}>
            Add path
          </Button>
        </div>

        {paths.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No pedestrian paths have been added yet.
          </p>
        ) : (
          <div className="space-y-2">
            {paths.map((path) => (
              <div
                key={path.id}
                className={`flex items-center gap-2 rounded-lg border p-3 ${draft?.id === path.id ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <button
                  type="button"
                  onClick={() => selectPath(path)}
                  className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-pressed={draft?.id === path.id}
                >
                  <span className="block truncate text-sm font-medium">
                    {path.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {PATH_TYPE_LABELS[path.path_type]} · {path.is_active ? "Active" : "Inactive"}
                  </span>
                </button>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  aria-label={`Delete ${path.name}`}
                  onClick={() => setPendingDelete(path)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}

        {pendingDelete && (
          <div
            role="alertdialog"
            aria-label={`Delete ${pendingDelete.name}`}
            className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4"
          >
            <p className="text-sm">
              Delete <strong>{pendingDelete.name}</strong>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={isPending}
                onClick={deletePath}
              >
                Delete path
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="min-w-0 space-y-4" aria-label="Pedestrian path editor">
        {!draft ? (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Select a path to edit it or add a new path.
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium sm:col-span-2">
                Path name
                <input
                  maxLength={120}
                  value={draft.name}
                  onChange={(event) => updateDraft("name", event.target.value)}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal"
                  aria-invalid={Boolean(fieldError("name"))}
                />
                {fieldError("name") && (
                  <span className="mt-1 block text-xs text-destructive">{fieldError("name")}</span>
                )}
              </label>

              <label className="text-sm font-medium">
                Path type
                <select
                  value={draft.path_type}
                  onChange={(event) =>
                    updateDraft("path_type", event.target.value as PedestrianPathType)
                  }
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal"
                >
                  {Object.entries(PATH_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium">
                Wheelchair access
                <select
                  value={draft.wheelchair_accessible ? "yes" : "no"}
                  onChange={(event) =>
                    updateDraft("wheelchair_accessible", event.target.value === "yes")
                  }
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal"
                >
                  <option value="yes">Wheelchair accessible</option>
                  <option value="no">Not wheelchair accessible</option>
                </select>
              </label>

              <label className="text-sm font-medium">
                Surface <span className="font-normal text-muted-foreground">(optional)</span>
                <input
                  maxLength={100}
                  value={draft.surface ?? ""}
                  onChange={(event) => updateDraft("surface", event.target.value || null)}
                  placeholder="Concrete, gravel, paving…"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal"
                  aria-invalid={Boolean(fieldError("surface"))}
                />
                {fieldError("surface") && (
                  <span className="mt-1 block text-xs text-destructive">{fieldError("surface")}</span>
                )}
              </label>

              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.is_active}
                  onChange={(event) => updateDraft("is_active", event.target.checked)}
                  className="size-4 accent-primary"
                />
                Active on public map
              </label>

              <label className="text-sm font-medium sm:col-span-2">
                Notes <span className="font-normal text-muted-foreground">(optional)</span>
                <textarea
                  maxLength={1000}
                  rows={3}
                  value={draft.notes ?? ""}
                  onChange={(event) => updateDraft("notes", event.target.value || null)}
                  className="mt-1 block w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm font-normal"
                  aria-invalid={Boolean(fieldError("notes"))}
                />
                {fieldError("notes") && (
                  <span className="mt-1 block text-xs text-destructive">{fieldError("notes")}</span>
                )}
              </label>
            </div>

            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">Path geometry</h3>
                  <p className="text-xs text-muted-foreground">
                    Click map points in order. Explicitly link vertices to junctions or entrances; reference proximity does not connect them.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant={isInserting ? "default" : "outline"} disabled={draft.geometry.coordinates.length < 2} onClick={() => { setIsDrawing(false); setIsInserting((value) => !value) }}>
                    {isInserting ? "Cancel vertex insertion" : "Insert intersection vertex"}
                  </Button>
                  {!isDrawing ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => setIsDrawing(true)}>
                      Add points
                    </Button>
                  ) : (
                    <>
                      <Button type="button" size="sm" onClick={() => setIsDrawing(false)}>
                        Finish drawing
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDraft((current) => current ? {
                            ...current,
                            geometry: cloneLineString(originalGeometry ?? { type: "LineString", coordinates: [] }),
                          } : current)
                          setIsDrawing(false)
                          setErrors((current) => ({ ...current, geometry: [] }))
                        }}
                      >
                        Cancel drawing
                      </Button>
                    </>
                  )}
                  {draft.geometry.coordinates.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant={isGeometryEditable ? "default" : "outline"}
                      onClick={() => setIsGeometryEditable((value) => !value)}
                    >
                      {isGeometryEditable ? "Finish editing points" : "Edit points"}
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={draft.geometry.coordinates.length === 0}
                    onClick={() => updateDraft("geometry", { type: "LineString", coordinates: [] })}
                  >
                    Clear path
                  </Button>
                </div>
              </div>

              {isDrawing && (
                <p className="text-xs text-primary" role="status">
                  Click the map to add successive path points, then finish drawing.
                </p>
              )}
              {isInserting && <p className="text-xs text-primary" role="status">Click near the crossing on the selected path to insert a vertex. Then connect that vertex explicitly.</p>}
              {fieldError("geometry") && (
                <p className="text-xs text-destructive" role="alert">{fieldError("geometry")}</p>
              )}

              <PedestrianPathMap
                paths={paths}
                locations={locations}
                entrances={entrances}
                graphNodes={graphNodes}
                selectedPathId={selectedPathId}
                draftGeometry={draft.geometry as LineString}
                draftType={draft.path_type}
                wheelchairAccessible={draft.wheelchair_accessible}
                isDrawing={isDrawing}
                isInserting={isInserting}
                isGeometryEditable={isGeometryEditable}
                onSelectPath={(id) => {
                  const path = paths.find((item) => item.id === id)
                  if (path) selectPath(path)
                }}
                onAddPoint={addPoint}
                onInsertPoint={insertPoint}
                onMovePoint={movePoint}
              />

              <div className="max-h-32 space-y-1 overflow-y-auto">
                {draft.geometry.coordinates.map(([lng, lat], index) => (
                  (() => {
                  const connection = draft.id ? connections.find((item) => item.path_id === draft.id && item.vertex_index === index) : undefined
                  const linkedNode = connection ? graphNodes.find((node) => node.id === connection.node_id) : undefined
                  return (
                  <div key={index} className="flex items-center justify-between gap-3 text-xs">
                    <span className="min-w-0">Point {index + 1}: {lat.toFixed(6)}, {lng.toFixed(6)}{linkedNode ? ` · linked ${linkedNode.kind}` : " · unlinked"}</span>
                    <div className="flex shrink-0 gap-1">
                      {draft.id && linkedNode ? <Button type="button" size="xs" variant="outline" onClick={() => void unlinkVertex(index)}>Unlink</Button> : draft.id ? <>
                        <Button type="button" size="xs" variant="outline" onClick={() => void linkVertex(index, { kind: "junction" })}>New junction</Button>
                        {graphNodes.filter((node) => node.kind === "junction").length > 0 && <select aria-label={`Link point ${index + 1} to junction`} className="max-w-32 rounded border bg-background px-1" defaultValue="" onChange={(event) => { if (event.target.value) void linkVertex(index, { kind: "junction", nodeId: event.target.value }) }}><option value="">Junction…</option>{graphNodes.filter((node) => node.kind === "junction").map((node) => <option key={node.id} value={node.id}>{node.name ?? `Junction ${node.id.slice(0, 6)}`}</option>)}</select>}
                        <select aria-label={`Link point ${index + 1} to entrance`} className="max-w-32 rounded border bg-background px-1" defaultValue="" onChange={(event) => { if (event.target.value) void linkVertex(index, { kind: "entrance", entranceId: event.target.value }) }}>
                          <option value="">Entrance…</option>{entrances.map((entrance) => <option key={entrance.id} value={entrance.id}>{entrance.name}</option>)}
                        </select>
                      </> : null}
                      <Button type="button" size="xs" variant="ghost" onClick={() => removePoint(index)}>Remove</Button>
                    </div>
                  </div>
                  )
                  })()
                ))}
                {draft.geometry.coordinates.length === 0 && (
                  <p className="text-xs text-muted-foreground">No points yet.</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div className="min-h-5 text-xs" aria-live="polite">
                {formMessage && (
                  <span className={formMessage.includes("saved") || formMessage.includes("deleted") ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}>
                    {formMessage}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                  Close editor
                </Button>
                <Button type="button" disabled={isPending} onClick={savePath}>
                  {isPending ? "Saving…" : draft.id ? "Save path" : "Create path"}
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
