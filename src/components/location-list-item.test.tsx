// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { LocationListItem } from "./location-list-item"
import type { Location } from "@/lib/types"

describe("LocationListItem accessibility", () => {
  const sampleLocation: Location = {
    id: "loc-1",
    name: "Engineering Hall",
    code: "B-002",
    type: "building",
    description: "Main engineering facility",
  }

  it("without onClick, it is not focusable and has no button role", () => {
    render(<LocationListItem location={sampleLocation} />)

    const item = screen.getByTestId("location-list-item")
    expect(item.tagName.toLowerCase()).toBe("article")
    expect(screen.queryByRole("button")).toBeNull()
    expect(item.getAttribute("tabindex")).toBeNull()
  })

  it("with onClick, exposes button semantics and is focusable", () => {
    const handleClick = vi.fn()
    render(<LocationListItem location={sampleLocation} onClick={handleClick} />)

    const button = screen.getByRole("button")
    expect(button).toBeDefined()
    expect(button.getAttribute("tabindex")).toBe("0")
  })

  it("with onClick, mouse click triggers onClick", () => {
    const handleClick = vi.fn()
    render(<LocationListItem location={sampleLocation} onClick={handleClick} />)

    const button = screen.getByRole("button")
    fireEvent.click(button)

    expect(handleClick).toHaveBeenCalledTimes(1)
    expect(handleClick).toHaveBeenCalledWith(sampleLocation)
  })

  it("with onClick, Enter key triggers onClick", () => {
    const handleClick = vi.fn()
    render(<LocationListItem location={sampleLocation} onClick={handleClick} />)

    const button = screen.getByRole("button")
    fireEvent.keyDown(button, { key: "Enter" })

    expect(handleClick).toHaveBeenCalledTimes(1)
    expect(handleClick).toHaveBeenCalledWith(sampleLocation)
  })

  it("with onClick, Space key triggers onClick and prevents default scroll", () => {
    const handleClick = vi.fn()
    render(<LocationListItem location={sampleLocation} onClick={handleClick} />)

    const button = screen.getByRole("button")
    const event = new KeyboardEvent("keydown", {
      key: " ",
      bubbles: true,
      cancelable: true,
    })
    const preventDefaultSpy = vi.spyOn(event, "preventDefault")

    button.dispatchEvent(event)

    expect(preventDefaultSpy).toHaveBeenCalled()
    expect(handleClick).toHaveBeenCalledTimes(1)
    expect(handleClick).toHaveBeenCalledWith(sampleLocation)
  })

  it("with onClick, other keys do not trigger onClick", () => {
    const handleClick = vi.fn()
    render(<LocationListItem location={sampleLocation} onClick={handleClick} />)

    const button = screen.getByRole("button")

    fireEvent.keyDown(button, { key: "ArrowDown" })
    fireEvent.keyDown(button, { key: "Escape" })
    fireEvent.keyDown(button, { key: "Tab" })
    fireEvent.keyDown(button, { key: "a" })

    expect(handleClick).not.toHaveBeenCalled()
  })
})
