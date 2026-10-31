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

    expect(screen.getAllByTestId("category-chip-all").length).toBeGreaterThan(0)
    expect(screen.getAllByTestId("category-chip-cat-acad").length).toBeGreaterThan(0)
    expect(screen.getAllByTestId("category-chip-cat-admin").length).toBeGreaterThan(0)
    expect(screen.getAllByTestId("category-chip-cat-health").length).toBeGreaterThan(0)

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

    const acadChips = screen.getAllByTestId("category-chip-cat-acad")
    fireEvent.click(acadChips[0])

    expect(screen.getByText("Engineering Hall")).toBeDefined()
    expect(screen.queryByText("Main Administration")).toBeNull()
    expect(screen.queryByText("Campus Clinic")).toBeNull()
    expect(screen.getByText(/1 location found/i)).toBeDefined()
  })

  it("clicking the active category chip again toggles back to all locations", () => {
    render(
      <CampusExplorer
        initialLocations={sampleLocations}
        initialCategories={sampleCategories}
      />
    )

    const acadChips = screen.getAllByTestId("category-chip-cat-acad")
    fireEvent.click(acadChips[0])
    expect(screen.queryByText("Main Administration")).toBeNull()

    fireEvent.click(acadChips[0])
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

    const adminChips = screen.getAllByTestId("category-chip-cat-admin")
    fireEvent.click(adminChips[0])

    const searchInputs = screen.getAllByPlaceholderText(/search/i)
    fireEvent.change(searchInputs[0], { target: { value: "President" } })

    expect(screen.getByText("Main Administration")).toBeDefined()
    expect(screen.queryByText("Engineering Hall")).toBeNull()
    expect(screen.queryByText("Campus Clinic")).toBeNull()
  })

  it("auto-selects location and displays featured card when URL contains ?location= parameter", () => {
    window.history.replaceState({}, "", "/?location=B-002")

    render(
      <CampusExplorer
        initialLocations={sampleLocations}
        initialCategories={sampleCategories}
      />
    )

    expect(screen.getByTestId("featured-location-card")).toBeDefined()
    expect(screen.getByText("Main Administration")).toBeDefined()
    expect(screen.getByText("President and Registrar offices")).toBeDefined()
  })

  it("updates URL and shows featured card when a location item is clicked", () => {
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
    expect(screen.getByTestId("featured-location-card")).toBeDefined()
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

  it("switches to saved tab and displays saved empty state when none saved", () => {
    render(
      <CampusExplorer
        initialLocations={sampleLocations}
        initialCategories={sampleCategories}
      />
    )

    const savedTab = screen.getByTestId("tab-saved")
    fireEvent.click(savedTab)

    expect(savedTab.getAttribute("aria-selected")).toBe("true")
    expect(screen.getByText("No saved places yet")).toBeDefined()
  })

  it("adjusts bottom sheet snap height between peek, half, and full via drag handle", () => {
    render(
      <CampusExplorer
        initialLocations={sampleLocations}
        initialCategories={sampleCategories}
      />
    )

    const handle = screen.getByTestId("bottom-sheet-handle")
    const directory = screen.getByRole("region", { name: /Campus Directory/i })

    // Initial state is half (h-[50dvh])
    expect(directory.className).toContain("h-[50dvh]")

    // Click 1: half -> full (h-[90dvh])
    fireEvent.click(handle)
    expect(directory.className).toContain("h-[90dvh]")

    // Click 2: full -> peek (h-[76px])
    fireEvent.click(handle)
    expect(directory.className).toContain("h-[76px]")

    // Click 3: peek -> half (h-[50dvh])
    fireEvent.click(handle)
    expect(directory.className).toContain("h-[50dvh]")
  })

  it("toggles distance sorting when filter sliders or closest button is clicked", () => {
    render(
      <CampusExplorer
        initialLocations={sampleLocations}
        initialCategories={sampleCategories}
      />
    )

    const slidersBtn = screen.getAllByTestId("filter-sliders-button")[0]
    expect(slidersBtn.getAttribute("aria-label")).toBe("Sort by nearest")

    fireEvent.click(slidersBtn)
    expect(slidersBtn.getAttribute("aria-label")).toBe("Clear distance sort")

    const closestBtn = screen.getByTestId("nearby-sort-toggle")
    fireEvent.click(closestBtn)
    expect(closestBtn.getAttribute("aria-pressed")).toBe("false")
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
      screen.getAllByPlaceholderText(/በስም፣ መግለጫ ወይም በህንፃ ኮድ ይፈልጉ/i).length
    ).toBeGreaterThan(0)

    // Amharic category chips
    expect(screen.getAllByTestId("category-chip-all")[0].textContent).toContain("ሁሉም")
    expect(screen.getAllByTestId("category-chip-cat-acad")[0].textContent).toContain("ትምህርት")
    expect(screen.getAllByTestId("category-chip-cat-admin")[0].textContent).toContain("አስተዳደር")
  })
})
