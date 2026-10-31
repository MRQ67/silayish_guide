// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { LocationDetailPanel } from "./location-detail-panel"
import type { Location } from "@/lib/types"

describe("LocationDetailPanel", () => {
  const parentLocation: Location = {
    id: "parent-1",
    name: "Institute of Technology",
    code: "B-003",
    type: "building",
    description: "Main engineering and technology complex",
    opening_hours: "Mon - Fri 08:00 - 18:00",
    lat: 9.6192,
    lng: 41.8375,
  }

  const childLocation: Location = {
    id: "child-1",
    name: "Computing and AI Lab",
    code: "B-003-L1",
    type: "lab",
    parent_id: "parent-1",
    floor: 2,
    description: "Software engineering and AI lab",
  }

  const allLocations = [parentLocation, childLocation]

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("renders building details, code, hours, and nested places", () => {
    const handleBack = vi.fn()
    const handleSelect = vi.fn()

    render(
      <LocationDetailPanel
        location={parentLocation}
        allLocations={allLocations}
        onBack={handleBack}
        onSelectLocation={handleSelect}
      />
    )

    expect(screen.getByText("Institute of Technology")).toBeDefined()
    expect(screen.getByText("B-003")).toBeDefined()
    expect(screen.getByText("Main engineering and technology complex")).toBeDefined()
    expect(screen.getByText("Mon - Fri 08:00 - 18:00")).toBeDefined()

    // Places inside
    expect(screen.getByText("Places Inside (1)")).toBeDefined()
    expect(screen.getByText("Computing and AI Lab")).toBeDefined()
    expect(screen.getByText("Floor 2")).toBeDefined()
  })

  it("clicking back button triggers onBack", () => {
    const handleBack = vi.fn()
    const handleSelect = vi.fn()

    render(
      <LocationDetailPanel
        location={parentLocation}
        allLocations={allLocations}
        onBack={handleBack}
        onSelectLocation={handleSelect}
      />
    )

    const backBtn = screen.getByTestId("detail-back-button")
    fireEvent.click(backBtn)
    expect(handleBack).toHaveBeenCalledTimes(1)
  })

  it("clicking a child facility triggers onSelectLocation with child", () => {
    const handleBack = vi.fn()
    const handleSelect = vi.fn()

    render(
      <LocationDetailPanel
        location={parentLocation}
        allLocations={allLocations}
        onBack={handleBack}
        onSelectLocation={handleSelect}
      />
    )

    const childBtn = screen.getByTestId("child-location-child-1")
    fireEvent.click(childBtn)
    expect(handleSelect).toHaveBeenCalledTimes(1)
    expect(handleSelect).toHaveBeenCalledWith(childLocation)
  })

  it("when viewing a child location, displays located inside parent reference", () => {
    const handleBack = vi.fn()
    const handleSelect = vi.fn()

    render(
      <LocationDetailPanel
        location={childLocation}
        allLocations={allLocations}
        onBack={handleBack}
        onSelectLocation={handleSelect}
      />
    )

    expect(screen.getByText("Located inside:")).toBeDefined()
    const parentLink = screen.getByText("Institute of Technology")
    fireEvent.click(parentLink)
    expect(handleSelect).toHaveBeenCalledWith(parentLocation)
  })

  it("dismisses panel when user presses Escape key", () => {
    const handleBack = vi.fn()
    const handleSelect = vi.fn()

    render(
      <LocationDetailPanel
        location={parentLocation}
        allLocations={allLocations}
        onBack={handleBack}
        onSelectLocation={handleSelect}
      />
    )

    fireEvent.keyDown(window, { key: "Escape" })
    expect(handleBack).toHaveBeenCalledTimes(1)
  })

  it("calculates directions link from parent when child has no coordinates", () => {
    render(
      <LocationDetailPanel
        location={childLocation}
        allLocations={allLocations}
        onBack={vi.fn()}
        onSelectLocation={vi.fn()}
      />
    )

    const directionsLink = screen.getByRole("link", { name: /directions/i })
    expect(directionsLink.getAttribute("href")).toContain(
      `destination=${parentLocation.lat},${parentLocation.lng}`
    )
  })

  it("displays distance badge when distanceMeters is provided", () => {
    render(
      <LocationDetailPanel
        location={parentLocation}
        allLocations={allLocations}
        onBack={vi.fn()}
        onSelectLocation={vi.fn()}
        distanceMeters={240}
      />
    )

    const badge = screen.getByTestId("detail-distance-badge")
    expect(badge.textContent).toContain("~240 m away")
  })

  it("triggers onStartDirections when directions button is clicked", () => {
    const handleDirections = vi.fn()
    render(
      <LocationDetailPanel
        location={parentLocation}
        allLocations={allLocations}
        onBack={vi.fn()}
        onSelectLocation={vi.fn()}
        onStartDirections={handleDirections}
      />
    )

    const dirBtn = screen.getByTestId("start-directions-button")
    fireEvent.click(dirBtn)
    expect(handleDirections).toHaveBeenCalledTimes(1)
  })

  it("triggers onToggleBookmark when bookmark button is clicked", () => {
    const handleBookmark = vi.fn()
    render(
      <LocationDetailPanel
        location={parentLocation}
        allLocations={allLocations}
        onBack={vi.fn()}
        onSelectLocation={vi.fn()}
        onToggleBookmark={handleBookmark}
        isBookmarked={false}
      />
    )

    const bmBtn = screen.getByTestId("bookmark-location-button")
    fireEvent.click(bmBtn)
    expect(handleBookmark).toHaveBeenCalledTimes(1)
    expect(handleBookmark).toHaveBeenCalledWith(parentLocation.id)
  })
})
