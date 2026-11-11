// @vitest-environment jsdom
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import type { PedestrianPath } from "@/lib/types"
import { PedestrianPathsLayer } from "./pedestrian-paths-layer"

vi.mock("react-leaflet", () => ({
  Polyline: (props: {
    children?: ReactNode
    pathOptions: { color: string }
    positions: [number, number][]
  }) => (
    <div
      data-testid="pedestrian-path-line"
      data-color={props.pathOptions.color}
      data-positions={JSON.stringify(props.positions)}
    >
      {props.children}
    </div>
  ),
  Popup: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

const makePath = (
  id: string,
  is_active: boolean,
  wheelchair_accessible: boolean
): PedestrianPath => ({
  id,
  name: `Path ${id}`,
  geometry: { type: "LineString", coordinates: [[41.8, 9.6], [41.9, 9.7]] },
  path_type: "walkway",
  wheelchair_accessible,
  surface: "Paving",
  notes: "Use east side",
  is_active,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
})

describe("PedestrianPathsLayer", () => {
  it("renders active paths with explicit accessibility details and omits inactive paths", () => {
    render(
      <PedestrianPathsLayer
        paths={[
          makePath("accessible", true, true),
          makePath("inactive", false, true),
          makePath("not-accessible", true, false),
        ]}
      />
    )

    expect(screen.getAllByTestId("pedestrian-path-line")).toHaveLength(2)
    expect(screen.getByText("Wheelchair accessible")).toBeDefined()
    expect(screen.getByText("Not wheelchair accessible")).toBeDefined()
    expect(screen.getAllByText("Surface: Paving")).toHaveLength(2)
    expect(screen.getAllByText("Use east side")).toHaveLength(2)
  })
})
