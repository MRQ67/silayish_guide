import { describe, expect, it } from "vitest"
import { renderToString } from "react-dom/server"
import { CodeBadge } from "./code-badge"
import { LocationListItem } from "./location-list-item"
import { MapPopup } from "./map-popup"
import type { Location } from "@/lib/types"

describe("CodeBadge", () => {
  it("renders nothing when code is null", () => {
    const html = renderToString(<CodeBadge code={null} />)
    expect(html).toBe("")
  })

  it("renders nothing when code is undefined", () => {
    const html = renderToString(<CodeBadge />)
    expect(html).toBe("")
  })

  it("renders code with font-stencil and wall signage styling", () => {
    const html = renderToString(<CodeBadge code="B-002" />)
    expect(html).toContain("B-002")
    expect(html).toContain("font-stencil")
    expect(html).toContain('data-testid="code-badge"')
  })
})

describe("LocationListItem and MapPopup integration with CodeBadge", () => {
  const buildingWithCode: Location = {
    id: "loc-1",
    name: "Engineering Hall",
    code: "B-002",
    type: "building",
    description: "Main engineering facility",
    opening_hours: "08:00 - 17:00",
  }

  const facilityWithoutCode: Location = {
    id: "loc-2",
    name: "Campus Quad",
    code: null,
    type: "facility",
    description: "Central lawn",
  }

  it("renders CodeBadge inside LocationListItem when code exists", () => {
    const html = renderToString(
      <LocationListItem location={buildingWithCode} />
    )
    expect(html).toContain("Engineering Hall")
    expect(html).toContain("B-002")
    expect(html).toContain("font-stencil")
  })

  it("does not render CodeBadge inside LocationListItem when code is null", () => {
    const html = renderToString(
      <LocationListItem location={facilityWithoutCode} />
    )
    expect(html).toContain("Campus Quad")
    expect(html).not.toContain('data-testid="code-badge"')
  })

  it("renders CodeBadge inside MapPopup when code exists", () => {
    const html = renderToString(<MapPopup location={buildingWithCode} />)
    expect(html).toContain("Engineering Hall")
    expect(html).toContain("B-002")
    expect(html).toContain("font-stencil")
  })

  it("does not render CodeBadge inside MapPopup when code is null", () => {
    const html = renderToString(<MapPopup location={facilityWithoutCode} />)
    expect(html).toContain("Campus Quad")
    expect(html).not.toContain('data-testid="code-badge"')
  })
})
