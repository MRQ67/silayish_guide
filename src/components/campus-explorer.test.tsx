// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render as rtlRender, screen } from "@testing-library/react"
import type { ReactElement, ReactNode } from "react"
import { CampusExplorer } from "./campus-explorer"
import { LanguageProvider } from "./language-provider"
import { ThemeProvider } from "./theme-provider"
import type { Category, Location, Service } from "@/lib/types"

function TestProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </ThemeProvider>
  )
}

function render(ui: ReactElement) {
  return rtlRender(ui, { wrapper: TestProviders })
}

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
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 768,
    })
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1024,
    })
    class TestPointerEvent extends MouseEvent {
      pointerId: number
      pointerType: string

      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init)
        this.pointerId = init.pointerId ?? 1
        this.pointerType = init.pointerType ?? "touch"
      }
    }
    Object.defineProperty(window, "PointerEvent", {
      configurable: true,
      value: TestPointerEvent,
    })
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

  it("resizes the mobile panel continuously from the handle and preserves the released height", () => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 600,
    })
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 375,
    })
    render(
      <CampusExplorer
        initialLocations={sampleLocations}
        initialCategories={sampleCategories}
      />
    )

    const handle = screen.getByTestId("bottom-sheet-handle")
    const directory = screen.getByRole("region", { name: /Campus Directory/i })

    expect(directory.className).toContain("h-[50dvh]")

    fireEvent.pointerDown(handle, {
      pointerId: 1,
      pointerType: "touch",
      clientY: 420,
    })
    fireEvent.pointerMove(handle, {
      pointerId: 1,
      pointerType: "touch",
      clientY: 270,
    })
    expect(directory.style.getPropertyValue("--mobile-panel-height")).toBe(
      "450px"
    )

    fireEvent.pointerUp(handle, {
      pointerId: 1,
      pointerType: "touch",
      clientY: 270,
    })
    expect(directory.style.getPropertyValue("--mobile-panel-height")).toBe(
      "450px"
    )

    fireEvent.click(handle)
    expect(directory.style.getPropertyValue("--mobile-panel-height")).toBe(
      "450px"
    )
    expect(directory.className).toContain("md:h-full")
    expect(screen.getByTestId("bottom-sheet-handle-container").className).toContain(
      "md:hidden"
    )
  })

  it("does not start resizing when pointer movement begins in the list header", () => {
    render(
      <CampusExplorer
        initialLocations={sampleLocations}
        initialCategories={sampleCategories}
      />
    )
    const directory = screen.getByRole("region", { name: /Campus Directory/i })
    const listHeader = screen.getByTestId("nearby-sort-toggle")
      .parentElement as HTMLElement

    fireEvent.pointerDown(listHeader, { pointerId: 2, clientY: 400 })
    fireEvent.pointerMove(listHeader, { pointerId: 2, clientY: 250 })

    expect(directory.style.getPropertyValue("--mobile-panel-height")).toBe("")
  })

  it("supports keyboard navigation with arrow keys across floating dock tabs", () => {
    render(
      <CampusExplorer
        initialLocations={sampleLocations}
        initialCategories={sampleCategories}
        initialServices={sampleServices}
      />
    )

    const locTab = screen.getByTestId("tab-locations")
    const srvTab = screen.getByTestId("tab-services")
    const savTab = screen.getByTestId("tab-saved")

    locTab.focus()
    fireEvent.keyDown(locTab, { key: "ArrowRight" })
    expect(srvTab.getAttribute("aria-selected")).toBe("true")

    fireEvent.keyDown(srvTab, { key: "ArrowRight" })
    expect(savTab.getAttribute("aria-selected")).toBe("true")

    fireEvent.keyDown(savTab, { key: "ArrowLeft" })
    expect(srvTab.getAttribute("aria-selected")).toBe("true")
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
