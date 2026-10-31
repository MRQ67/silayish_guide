// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { CampusExplorer } from "./campus-explorer"
import type { Category, Location } from "@/lib/types"

vi.mock("next/dynamic", () => ({
  default: () => {
    return function MockCampusMap() {
      return <div data-testid="mock-campus-map">Map</div>
    }
  },
}))

describe("CampusExplorer Category Filtering", () => {
  const sampleCategories: Category[] = [
    { id: "cat-acad", name: "Academics", icon: "graduation-cap" },
    { id: "cat-admin", name: "Administration", icon: "building-2" },
    { id: "cat-health", name: "Healthcare", icon: "heart-pulse" },
  ]

  const sampleLocations: Location[] = [
    {
      id: "loc-1",
      name: "Engineering Hall",
      code: "B-001",
      type: "building",
      category_id: "cat-acad",
      category: sampleCategories[0],
      description: "Engineering departments and lecture halls",
    },
    {
      id: "loc-2",
      name: "Main Administration",
      code: "B-002",
      type: "building",
      category_id: "cat-admin",
      category: sampleCategories[1],
      description: "President and Registrar offices",
    },
    {
      id: "loc-3",
      name: "Campus Clinic",
      code: "B-003",
      type: "facility",
      category_id: "cat-health",
      category: sampleCategories[2],
      description: "Outpatient medical services",
    },
  ]

  it("renders all category filter chips with location counts", () => {
    render(
      <CampusExplorer
        initialLocations={sampleLocations}
        initialCategories={sampleCategories}
      />
    )

    expect(screen.getByTestId("category-chip-all")).toBeDefined()
    expect(screen.getByTestId("category-chip-cat-acad")).toBeDefined()
    expect(screen.getByTestId("category-chip-cat-admin")).toBeDefined()
    expect(screen.getByTestId("category-chip-cat-health")).toBeDefined()

    // 3 locations initially displayed
    expect(screen.getByText("Engineering Hall")).toBeDefined()
    expect(screen.getByText("Main Administration")).toBeDefined()
    expect(screen.getByText("Campus Clinic")).toBeDefined()
  })

  it("filters locations when a category chip is clicked", () => {
    render(
      <CampusExplorer
        initialLocations={sampleLocations}
        initialCategories={sampleCategories}
      />
    )

    const acadChip = screen.getByTestId("category-chip-cat-acad")
    fireEvent.click(acadChip)

    // Engineering Hall matches, other 2 should not be in document
    expect(screen.getByText("Engineering Hall")).toBeDefined()
    expect(screen.queryByText("Main Administration")).toBeNull()
    expect(screen.queryByText("Campus Clinic")).toBeNull()
    expect(screen.getByText("1 location found")).toBeDefined()
  })

  it("clicking the active category chip again toggles back to all locations", () => {
    render(
      <CampusExplorer
        initialLocations={sampleLocations}
        initialCategories={sampleCategories}
      />
    )

    const acadChip = screen.getByTestId("category-chip-cat-acad")
    fireEvent.click(acadChip)
    expect(screen.queryByText("Main Administration")).toBeNull()

    // Click again to toggle off
    fireEvent.click(acadChip)
    expect(screen.getByText("Main Administration")).toBeDefined()
    expect(screen.getByText("3 locations found")).toBeDefined()
  })

  it("combines category filter and search query", () => {
    render(
      <CampusExplorer
        initialLocations={sampleLocations}
        initialCategories={sampleCategories}
      />
    )

    const acadChip = screen.getByTestId("category-chip-cat-acad")
    fireEvent.click(acadChip)

    const searchInput = screen.getByPlaceholderText(
      /search by name, description, or code/i
    )
    fireEvent.change(searchInput, { target: { value: "Engineering" } })

    expect(screen.getByText("Engineering Hall")).toBeDefined()

    // Now search for something not in Academics
    fireEvent.change(searchInput, { target: { value: "Clinic" } })
    expect(screen.queryByText("Engineering Hall")).toBeNull()
    expect(screen.getByText("No locations found")).toBeDefined()
  })
})
