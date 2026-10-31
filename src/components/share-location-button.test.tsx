// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import {
  getLocationShareUrl,
  ShareLocationButton,
} from "./share-location-button"
import type { Location } from "@/lib/types"

describe("ShareLocationButton", () => {
  const sampleLocation: Location = {
    id: "loc-1234",
    name: "Main Administration",
    code: "B-002",
    type: "building",
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("generates correct share URL with building code preference", () => {
    const url = getLocationShareUrl(sampleLocation)
    expect(url).toContain("location=B-002")
  })

  it("generates correct share URL with id when code is null", () => {
    const locWithoutCode: Location = {
      id: "loc-5678",
      name: "Facility Without Code",
      code: null,
      type: "facility",
    }
    const url = getLocationShareUrl(locWithoutCode)
    expect(url).toContain("location=loc-5678")
  })

  it("copies URL to clipboard and shows feedback when clicked", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })

    render(<ShareLocationButton location={sampleLocation} />)

    const button = screen.getByRole("button", {
      name: /share link for Main Administration/i,
    })
    expect(button).toBeDefined()

    fireEvent.click(button)

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledTimes(1)
      expect(screen.getByText("Link copied!")).toBeDefined()
    })
  })
})
