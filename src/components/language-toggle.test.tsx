// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { LanguageProvider, useLanguage } from "./language-provider"
import { LanguageToggle } from "./language-toggle"

function LanguageConsumer() {
  const { locale, t } = useLanguage()
  return (
    <div>
      <span data-testid="current-locale">{locale}</span>
      <span data-testid="app-name">{t.appName}</span>
    </div>
  )
}

describe("LanguageProvider & LanguageToggle", () => {
  beforeEach(() => {
    try {
      localStorage.clear()
    } catch {
      // ignore
    }
  })

  it("renders language toggle and switches between English and Amharic", () => {
    render(
      <LanguageProvider defaultLocale="en">
        <LanguageToggle />
        <LanguageConsumer />
      </LanguageProvider>
    )

    const toggleBtn = screen.getByTestId("language-toggle")
    expect(toggleBtn).toBeDefined()
    expect(screen.getByTestId("current-locale").textContent).toBe("en")
    expect(screen.getByTestId("app-name").textContent).toBe("DDU Campus Guide")

    fireEvent.click(toggleBtn)
    expect(screen.getByTestId("current-locale").textContent).toBe("am")
    expect(screen.getByTestId("app-name").textContent).toBe("ድሬዳዋ ዩኒቨርሲቲ ካምፓስ መመሪያ")

    fireEvent.click(toggleBtn)
    expect(screen.getByTestId("current-locale").textContent).toBe("en")
  })
})
