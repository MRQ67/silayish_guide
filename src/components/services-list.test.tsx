// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { ServicesList } from "./services-list"
import type { Location, Service } from "@/lib/types"

describe("ServicesList", () => {
  const sampleLocation: Location = {
    id: "loc-admin",
    name: "Main Administration Building",
    code: "B-001",
    type: "building",
  }

  const sampleServices: Service[] = [
    {
      id: "srv-1",
      name: "Student Registrar Office",
      description: "Handles student enrollment and transcripts",
      location_id: "loc-admin",
      hours: "Mon - Fri 08:30 - 16:30",
      contact: "registrar@ddu.edu.et",
    },
    {
      id: "srv-2",
      name: "Campus Security Desk",
      description: "Lost and found and emergency response",
      hours: "24/7",
    },
  ]

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("renders service items with name, description, hours, and contact", () => {
    render(
      <ServicesList
        services={sampleServices}
        allLocations={[sampleLocation]}
        onSelectLocation={vi.fn()}
      />
    )

    expect(screen.getByText("Student Registrar Office")).toBeDefined()
    expect(screen.getByText("Handles student enrollment and transcripts")).toBeDefined()
    expect(screen.getByText("Mon - Fri 08:30 - 16:30")).toBeDefined()
    expect(screen.getByText("registrar@ddu.edu.et")).toBeDefined()
    expect(screen.getByText("Campus Security Desk")).toBeDefined()
  })

  it("clicking 'On Map' triggers onSelectLocation with the linked location", () => {
    const handleSelect = vi.fn()
    render(
      <ServicesList
        services={sampleServices}
        allLocations={[sampleLocation]}
        onSelectLocation={handleSelect}
      />
    )

    const onMapBtn = screen.getByTestId("service-on-map-srv-1")
    fireEvent.click(onMapBtn)
    expect(handleSelect).toHaveBeenCalledTimes(1)
    expect(handleSelect).toHaveBeenCalledWith(sampleLocation)
  })

  it("renders empty state message when no services are available", () => {
    render(
      <ServicesList
        services={[]}
        allLocations={[]}
        onSelectLocation={vi.fn()}
      />
    )

    expect(screen.getByTestId("services-empty")).toBeDefined()
    expect(screen.getByText("No campus services listed")).toBeDefined()
  })
})
