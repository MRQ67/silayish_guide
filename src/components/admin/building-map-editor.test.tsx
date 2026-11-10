// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { LocationEntrance, Polygon } from "@/lib/types"

const mockSaveEntrances = vi.fn()
vi.mock("@/app/admin/entrance-actions", () => ({
  saveLocationEntrancesAction: (...args: unknown[]) =>
    mockSaveEntrances(...args),
}))
vi.mock("next/dynamic", () => ({
  default: () =>
    function MockBuildingMap({
      onMapPoint,
      onVertexMove,
      onEntranceMove,
      entrances,
    }: {
      onMapPoint: (point: [number, number]) => void
      onVertexMove: (
        polygon: number,
        ring: number,
        vertex: number,
        point: number[]
      ) => void
      onEntranceMove: (id: string, point: [number, number]) => void
      entrances: LocationEntrance[]
    }) {
      return (
        <div>
          <button type="button" onClick={() => onMapPoint([9.617, 41.836])}>
            Mock map click 1
          </button>
          <button type="button" onClick={() => onMapPoint([9.618, 41.837])}>
            Mock map click 2
          </button>
          <button type="button" onClick={() => onMapPoint([9.619, 41.838])}>
            Mock map click 3
          </button>
          <button
            type="button"
            onClick={() => onVertexMove(0, 0, 1, [41.836, 9.618])}
          >
            Mock move vertex
          </button>
          {entrances.map((entrance) => (
            <button
              key={entrance.id}
              type="button"
              onClick={() => onEntranceMove(entrance.id, [9.618, 41.837])}
            >
              Mock move {entrance.name || "entrance"}
            </button>
          ))}
        </div>
      )
    },
}))

import { BuildingMapEditor } from "./building-map-editor"

const locationId = "11111111-1111-4111-8111-111111111111"
const savedOutline: Polygon = {
  type: "Polygon",
  coordinates: [
    [
      [41.835, 9.617],
      [41.837, 9.617],
      [41.837, 9.619],
      [41.835, 9.619],
      [41.835, 9.617],
    ],
  ],
}
const savedEntrance: LocationEntrance = {
  id: "22222222-2222-4222-8222-222222222222",
  location_id: locationId,
  name: "Main gate",
  lat: 9.6175,
  lng: 41.836,
  accessibility: null,
  created_at: "2026-11-08T00:00:00.000Z",
}

beforeEach(() =>
  mockSaveEntrances.mockReset().mockResolvedValue({ success: true })
)

describe("BuildingMapEditor", () => {
  it("draws and finishes a polygon from map clicks", async () => {
    const onOutlineChange = vi.fn()
    render(
      <BuildingMapEditor
        isBuilding
        savedOutline={null}
        outline={null}
        latitude={null}
        longitude={null}
        onOutlineChange={onOutlineChange}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Draw area" }))
    fireEvent.click(screen.getByRole("button", { name: "Mock map click 1" }))
    fireEvent.click(screen.getByRole("button", { name: "Mock map click 2" }))
    fireEvent.click(screen.getByRole("button", { name: "Mock map click 3" }))
    fireEvent.click(screen.getByRole("button", { name: "Finish polygon" }))
    await waitFor(() =>
      expect(onOutlineChange).toHaveBeenCalledWith(
        expect.objectContaining({ type: "Polygon" })
      )
    )
  })

  it("edits existing vertices and saves moved entrance markers", async () => {
    const onOutlineChange = vi.fn()
    render(
      <BuildingMapEditor
        locationId={locationId}
        isBuilding
        savedOutline={savedOutline}
        outline={savedOutline}
        latitude={9.617}
        longitude={41.836}
        onOutlineChange={onOutlineChange}
        initialEntrances={[savedEntrance]}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Edit vertices" }))
    fireEvent.click(screen.getByRole("button", { name: "Mock move vertex" }))
    expect(onOutlineChange).toHaveBeenCalledWith(
      expect.objectContaining({ type: "Polygon" })
    )

    fireEvent.click(screen.getByRole("button", { name: "Add entrance" }))
    fireEvent.click(screen.getByRole("button", { name: "Mock move Main gate" }))
    fireEvent.click(screen.getByRole("button", { name: "Save entrances" }))
    await waitFor(() =>
      expect(mockSaveEntrances).toHaveBeenCalledWith(locationId, [
        expect.objectContaining({
          id: savedEntrance.id,
          lat: 9.618,
          lng: 41.837,
        }),
      ])
    )
  })

  it("adds, names, and deletes entrance markers", async () => {
    render(
      <BuildingMapEditor
        locationId={locationId}
        isBuilding
        savedOutline={null}
        outline={null}
        latitude={null}
        longitude={null}
        onOutlineChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Add entrance" }))
    fireEvent.click(screen.getByRole("button", { name: "Mock map click 1" }))
    const name = screen.getByRole("textbox", { name: "Entrance 1 name" })
    fireEvent.change(name, { target: { value: "West gate" } })
    fireEvent.click(screen.getByRole("button", { name: "Remove" }))
    expect(screen.getByText("Named entrances (0)")).toBeDefined()
  })
})
