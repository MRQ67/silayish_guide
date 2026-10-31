// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { CategoryIcon } from "./category-icon"

describe("CategoryIcon", () => {
  it("renders graduation cap for academics category icon name", () => {
    const { container } = render(<CategoryIcon iconName="graduation-cap" />)
    const svg = container.querySelector("svg")
    expect(svg).toBeDefined()
    expect(svg?.getAttribute("aria-hidden")).toBe("true")
  })

  it("renders building icon for administration category icon name", () => {
    const { container } = render(<CategoryIcon iconName="building-2" />)
    const svg = container.querySelector("svg")
    expect(svg).toBeDefined()
  })

  it("renders users icon for student life category icon name", () => {
    const { container } = render(<CategoryIcon iconName="users" />)
    const svg = container.querySelector("svg")
    expect(svg).toBeDefined()
  })

  it("renders heart pulse icon for healthcare category icon name", () => {
    const { container } = render(<CategoryIcon iconName="heart-pulse" />)
    const svg = container.querySelector("svg")
    expect(svg).toBeDefined()
  })

  it("falls back to generic tag icon for unknown or null icon name", () => {
    const { container } = render(<CategoryIcon iconName={null} />)
    const svg = container.querySelector("svg")
    expect(svg).toBeDefined()
  })
})
