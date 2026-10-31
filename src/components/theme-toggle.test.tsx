// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { ThemeProvider, useTheme } from "./theme-provider"
import { ThemeToggle } from "./theme-toggle"

function ThemeConsumer() {
  const { resolvedTheme } = useTheme()
  return <div data-testid="resolved-theme">{resolvedTheme}</div>
}

describe("ThemeProvider & ThemeToggle", () => {
  it("renders theme toggle button with accessible label and switches theme", () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
        <ThemeConsumer />
      </ThemeProvider>
    )

    const toggleBtn = screen.getByTestId("theme-toggle")
    expect(toggleBtn).toBeDefined()
    expect(screen.getByTestId("resolved-theme").textContent).toBe("light")

    fireEvent.click(toggleBtn)
    expect(screen.getByTestId("resolved-theme").textContent).toBe("dark")

    fireEvent.click(toggleBtn)
    expect(screen.getByTestId("resolved-theme").textContent).toBe("light")
  })
})
