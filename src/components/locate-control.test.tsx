// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createUserLocationIcon, LocateControl } from "./locate-control"

const mockFlyTo = vi.fn()
const mockGetZoom = vi.fn().mockReturnValue(16)

vi.mock("react-leaflet", () => ({
  useMap: () => ({
    flyTo: mockFlyTo,
    getZoom: mockGetZoom,
  }),
  Circle: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-circle">{children}</div>
  ),
  Marker: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-marker">{children}</div>
  ),
  Popup: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-popup">{children}</div>
  ),
}))

describe("LocateControl", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockFlyTo.mockClear()
    mockGetZoom.mockReturnValue(16)
  })

  it("renders the locate button with accessible label", () => {
    render(<LocateControl />)

    const button = screen.getByRole("button", {
      name: /locate me on campus/i,
    })
    expect(button).toBeDefined()
    expect(button.getAttribute("title")).toBe("Locate me on campus")
  })

  it("handles successful geolocation and triggers map flyTo", async () => {
    const mockGetCurrentPosition = vi.fn().mockImplementation((success) => {
      success({
        coords: {
          latitude: 9.6178,
          longitude: 41.8362,
          accuracy: 15,
        },
      })
    })

    Object.assign(navigator, {
      geolocation: {
        getCurrentPosition: mockGetCurrentPosition,
      },
    })

    render(<LocateControl />)

    const button = screen.getByRole("button", {
      name: /locate me on campus/i,
    })
    fireEvent.click(button)

    expect(mockGetCurrentPosition).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(mockFlyTo).toHaveBeenCalledWith([9.6178, 41.8362], 17, {
        animate: true,
        duration: 1.2,
      })
      expect(screen.getByTestId("mock-circle")).toBeDefined()
      expect(screen.getByTestId("mock-marker")).toBeDefined()
    })
  })

  it("displays error message when geolocation permission is denied", async () => {
    const mockGetCurrentPosition = vi.fn().mockImplementation((_, error) => {
      error({
        code: 1, // PERMISSION_DENIED
        message: "User denied Geolocation",
      })
    })

    Object.assign(navigator, {
      geolocation: {
        getCurrentPosition: mockGetCurrentPosition,
      },
    })

    render(<LocateControl />)

    const button = screen.getByRole("button", {
      name: /locate me on campus/i,
    })
    fireEvent.click(button)

    await waitFor(() => {
      const alert = screen.getByRole("alert")
      expect(alert).toBeDefined()
      expect(alert.textContent).toContain("Location access was denied")
    })
  })

  it("createUserLocationIcon generates divIcon with pulse styling", () => {
    const icon = createUserLocationIcon()
    expect(icon).toBeDefined()
    expect(icon.options.className).toBe("user-location-marker")
  })
})
