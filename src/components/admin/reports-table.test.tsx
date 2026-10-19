// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ReportsTable, type AdminReportItem } from "./reports-table"
import * as adminReportActions from "@/app/admin/reports/actions"

// Mock useRouter
const mockRefresh = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}))

describe("ReportsTable", () => {
  const sampleReports: AdminReportItem[] = [
    {
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      location_id: "11111111-1111-1111-1111-111111111111",
      message: "Room 102 air conditioner is leaking water.",
      status: "open",
      created_at: "2026-10-19T10:30:00Z",
      location: {
        id: "11111111-1111-1111-1111-111111111111",
        name: "Technology Center",
        code: "TC-01",
      },
    },
    {
      id: "b1ffcd88-8d1a-4fe7-aa5c-5aa8ac270b22",
      location_id: "22222222-2222-2222-2222-222222222222",
      message: "Old dormitory demolished.",
      status: "reviewed",
      created_at: "2026-10-18T14:15:00Z",
      location: null, // deleted location
    },
    {
      id: "c2eedd77-7e2b-4bc6-884b-4bb7ab160c33",
      location_id: "33333333-3333-3333-3333-333333333333",
      message: "Resolved broken chair report.",
      status: "resolved",
      created_at: "2026-10-17T09:00:00Z",
      location: {
        id: "33333333-3333-3333-3333-333333333333",
        name: "Library Complex",
        code: "LIB-01",
      },
    },
  ]

  beforeEach(() => {
    vi.restoreAllMocks()
    mockRefresh.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders report rows with location code and name, and 'Deleted location' when null", () => {
    render(
      <ReportsTable
        initialReports={sampleReports}
        currentStatus="all"
        currentPage={1}
        totalCount={3}
        pageSize={50}
      />
    )

    // First report location
    expect(screen.getByText("Technology Center")).toBeDefined()
    expect(screen.getByText("TC-01")).toBeDefined()
    expect(screen.getByText("Room 102 air conditioner is leaking water.")).toBeDefined()

    // Second report deleted location
    expect(screen.getByText("Deleted location")).toBeDefined()
    expect(screen.getByText("Old dormitory demolished.")).toBeDefined()

    // Edit location link
    const editLinks = screen.getAllByRole("link", { name: /edit location/i })
    expect(editLinks.length).toBe(2)
    expect(editLinks[0].getAttribute("href")).toBe(
      "/admin/locations/11111111-1111-1111-1111-111111111111/edit"
    )
  })

  it("renders status filter tabs with active tab highlighted", () => {
    render(
      <ReportsTable
        initialReports={sampleReports}
        currentStatus="open"
        currentPage={1}
        totalCount={3}
        pageSize={50}
      />
    )

    const openTab = screen.getByRole("tab", { name: /^open$/i })
    expect(openTab.getAttribute("aria-selected")).toBe("true")

    const reviewedTab = screen.getByRole("tab", { name: /^reviewed$/i })
    expect(reviewedTab.getAttribute("aria-selected")).toBe("false")
  })

  it("calls updateReportStatusAction when status action button is clicked", async () => {
    const updateSpy = vi
      .spyOn(adminReportActions, "updateReportStatusAction")
      .mockResolvedValue({ success: true })

    render(
      <ReportsTable
        initialReports={sampleReports}
        currentStatus="all"
        currentPage={1}
        totalCount={3}
        pageSize={50}
      />
    )

    // For the open report, click "Mark reviewed"
    const markReviewedButtons = screen.getAllByRole("button", {
      name: /mark reviewed/i,
    })
    fireEvent.click(markReviewedButtons[0])

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        "reviewed"
      )
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it("calls deleteReportAction after window.confirm confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    const deleteSpy = vi
      .spyOn(adminReportActions, "deleteReportAction")
      .mockResolvedValue({ success: true })

    render(
      <ReportsTable
        initialReports={sampleReports}
        currentStatus="all"
        currentPage={1}
        totalCount={3}
        pageSize={50}
      />
    )

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i })
    fireEvent.click(deleteButtons[0])

    expect(confirmSpy).toHaveBeenCalled()
    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith(
        "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
      )
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it("cancels deletion when window.confirm is rejected", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false)
    const deleteSpy = vi.spyOn(adminReportActions, "deleteReportAction")

    render(
      <ReportsTable
        initialReports={sampleReports}
        currentStatus="all"
        currentPage={1}
        totalCount={3}
        pageSize={50}
      />
    )

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i })
    fireEvent.click(deleteButtons[0])

    expect(deleteSpy).not.toHaveBeenCalled()
  })

  it("disables Previous button on page 1 and Next button on last page", () => {
    render(
      <ReportsTable
        initialReports={sampleReports}
        currentStatus="open"
        currentPage={1}
        totalCount={3}
        pageSize={50}
      />
    )

    const prevButton = screen.getByRole("button", { name: /previous/i })
    expect(prevButton.hasAttribute("disabled")).toBe(true)

    const nextButton = screen.getByRole("button", { name: /next/i })
    expect(nextButton.hasAttribute("disabled")).toBe(true)
  })
})
