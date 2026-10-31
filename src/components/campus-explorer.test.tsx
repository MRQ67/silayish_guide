// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { CampusExplorer } from "./campus-explorer"
import { LanguageProvider } from "./language-provider"
import type { Category, Location, Service } from "@/lib/types"

vi.mock("next/dynamic", () => ({
  default: () => {
    return function MockCampusMap() {
      return <div data-testid="mock-campus-map">Map</div>
    }
  },
}))

describe("CampusExplorer Category Filtering and Deep Linking", () => {
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

  const sampleServices: Service[] = [
    {
      id: "srv-1",
      name: "Registrar Office",
      description: "Student records and ID",
      location_id: "loc-2",
    },
  ]

  beforeEach(() => {
    window.history.replaceState({}, "", "/")
    try {
      localStorage.clear()
    } catch {
      // ignore
    }
  })

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

    fireEvent.click(acadChip)
    expect(screen.getByText("Engineering Hall")).toBeDefined()
    expect(screen.getByText("Main Administration")).toBeDefined()
    expect(screen.getByText("Campus Clinic")).toBeDefined()
  })

  it("combines category filter and search query", () => {
    render(
      <CampusExplorer
        initialLocations={sampleLocations}
        initialCategories={sampleCategories}
      />
    )

    const adminChip = screen.getByTestId("category-chip-cat-admin")
    fireEvent.click(adminChip)

    const searchInput = screen.getByPlaceholderText(/search/i)
    fireEvent.change(searchInput, { target: { value: "President" } })

    expect(screen.getByText("Main Administration")).toBeDefined()
    expect(screen.queryByText("Engineering Hall")).toBeNull()
    expect(screen.queryByText("Campus Clinic")).toBeNull()
  })

  it("auto-selects location and displays detail panel when URL contains ?location= parameter", () => {
    window.history.replaceState({}, "", "/?location=B-002")

    render(
      <CampusExplorer
        initialLocations={sampleLocations}
        initialCategories={sampleCategories}
      />
    )

    expect(screen.getByTestId("location-detail-panel")).toBeDefined()
    expect(screen.getByText("Main Administration")).toBeDefined()
    expect(screen.getByText("President and Registrar offices")).toBeDefined()
  })

  it("updates URL and shows detail panel when a location item is clicked", () => {
    render(
      <CampusExplorer
        initialLocations={sampleLocations}
        initialCategories={sampleCategories}
      />
    )

    const button = screen.getByText("Engineering Hall").closest("[role='button']")
    expect(button).not.toBeNull()
    fireEvent.click(button!)

    expect(window.location.search).toContain("location=B-001")
    expect(screen.getByTestId("location-detail-panel")).toBeDefined()
  })

  it("switches to services tab when Services button is clicked", () => {
    render(
      <CampusExplorer
        initialLocations={sampleLocations}
        initialCategories={sampleCategories}
        initialServices={sampleServices}
      />
    )

    const servicesTab = screen.getByTestId("tab-services")
    expect(servicesTab.getAttribute("aria-selected")).toBe("false")
    fireEvent.click(servicesTab)

    expect(servicesTab.getAttribute("aria-selected")).toBe("true")
    expect(screen.getByTestId("services-list")).toBeDefined()
    expect(screen.getByText("Registrar Office")).toBeDefined()
  })

  it("toggles mobile view mode between split, map, and list", () => {
    render(
      <CampusExplorer
        initialLocations={sampleLocations}
        initialCategories={sampleCategories}
      />
    )

    const mapBtn = screen.getByTestId("mobile-view-map")
    const listBtn = screen.getByTestId("mobile-view-list")
    const splitBtn = screen.getByTestId("mobile-view-split")

    fireEvent.click(mapBtn)
    expect(mapBtn.getAttribute("aria-pressed")).toBe("true")
    expect(mapBtn.className).toContain("bg-primary")

    fireEvent.click(listBtn)
    expect(listBtn.getAttribute("aria-pressed")).toBe("true")
    expect(listBtn.className).toContain("bg-primary")

    fireEvent.click(splitBtn)
    expect(splitBtn.getAttribute("aria-pressed")).toBe("true")
    expect(splitBtn.className).toContain("bg-primary")
  })

  it("localizes UI strings into Amharic when LanguageProvider is set to am", () => {
    render(
      <LanguageProvider defaultLocale="am">
        <CampusExplorer
          initialLocations={sampleLocations}
          initialCategories={sampleCategories}
        />
      </LanguageProvider>
    )

    // Amharic search placeholder
    expect(
      screen.getByPlaceholderText(/በስም፣ መግለጫ ወይም በህንፃ ኮድ ይፈልጉ/i)
    ).toBeDefined()

    // Amharic category chips
    expect(screen.getByTestId("category-chip-all").textContent).toContain("ሁሉም")
    expect(screen.getByTestId("category-chip-cat-acad").textContent).toContain("ትምህርት")
    expect(screen.getByTestId("category-chip-cat-admin").textContent).toContain("አስተዳደር")
  })
})
