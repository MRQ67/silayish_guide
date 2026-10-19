// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ReportProblemDialog } from "./report-problem-dialog"
import * as reportActions from "@/app/actions/report"

describe("ReportProblemDialog", () => {
  const sampleLocationId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
  const sampleLocationName = "Engineering Hall"

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders the trigger button with accessible label", () => {
    render(
      <ReportProblemDialog
        locationId={sampleLocationId}
        locationName={sampleLocationName}
      />
    )

    const button = screen.getByRole("button", { name: /report a problem/i })
    expect(button).toBeDefined()
    expect(button.getAttribute("aria-haspopup")).toBe("dialog")
  })

  it("opens accessible dialog on click with character counter and textarea", () => {
    render(
      <ReportProblemDialog
        locationId={sampleLocationId}
        locationName={sampleLocationName}
      />
    )

    const trigger = screen.getByRole("button", { name: /report a problem/i })
    fireEvent.click(trigger)

    const dialog = screen.getByRole("dialog")
    expect(dialog).toBeDefined()
    expect(dialog.getAttribute("aria-modal")).toBe("true")

    const textarea = screen.getByRole("textbox", { name: /describe the problem/i })
    expect(textarea).toBeDefined()

    expect(screen.getByText("0 / 1000")).toBeDefined()

    fireEvent.change(textarea, { target: { value: "Broken chair" } })
    expect(screen.getByText("12 / 1000")).toBeDefined()
  })

  it("closes the dialog when Escape key is pressed", async () => {
    render(
      <ReportProblemDialog
        locationId={sampleLocationId}
        locationName={sampleLocationName}
      />
    )

    const trigger = screen.getByRole("button", { name: /report a problem/i })
    fireEvent.click(trigger)

    expect(screen.getByRole("dialog")).toBeDefined()

    fireEvent.keyDown(window, { key: "Escape" })

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull()
    })
  })

  it("shows confirmation upon successful submission", async () => {
    vi.spyOn(reportActions, "submitReportAction").mockResolvedValue({
      success: true,
    })

    render(
      <ReportProblemDialog
        locationId={sampleLocationId}
        locationName={sampleLocationName}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /report a problem/i }))

    const textarea = screen.getByRole("textbox", { name: /describe the problem/i })
    fireEvent.change(textarea, { target: { value: "Light bulb is out" } })

    const submitBtn = screen.getByRole("button", { name: /submit report/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/thank you for your report!/i)).toBeDefined()
    })
  })

  it("keeps the typed message on submission failure and shows generic error", async () => {
    vi.spyOn(reportActions, "submitReportAction").mockResolvedValue({
      success: false,
      error: "We couldn't submit your report right now. Please try again later.",
    })

    render(
      <ReportProblemDialog
        locationId={sampleLocationId}
        locationName={sampleLocationName}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /report a problem/i }))

    const textarea = screen.getByRole("textbox", {
      name: /describe the problem/i,
    }) as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: "Door is jammed" } })

    const submitBtn = screen.getByRole("button", { name: /submit report/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined()
      expect(
        screen.getByText(/we couldn't submit your report right now/i)
      ).toBeDefined()
      // Message should be kept intact
      expect(textarea.value).toBe("Door is jammed")
    })
  })
})
