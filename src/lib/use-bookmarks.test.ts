// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useBookmarks } from "./use-bookmarks"

describe("useBookmarks", () => {
  let store: Record<string, string> = {}

  beforeEach(() => {
    store = {}
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, val: string) => {
          store[key] = val
        },
        removeItem: (key: string) => {
          delete store[key]
        },
        clear: () => {
          store = {}
        },
      },
      writable: true,
    })
  })

  it("initializes with empty bookmarks array", () => {
    const { result } = renderHook(() => useBookmarks())
    expect(result.current.bookmarks).toEqual([])
    expect(result.current.savedCount).toBe(0)
    expect(result.current.isBookmarked("loc-1")).toBe(false)
  })

  it("toggles bookmark on and off", () => {
    const { result } = renderHook(() => useBookmarks())

    act(() => {
      result.current.toggleBookmark("loc-1")
    })

    expect(result.current.bookmarks).toEqual(["loc-1"])
    expect(result.current.savedCount).toBe(1)
    expect(result.current.isBookmarked("loc-1")).toBe(true)

    act(() => {
      result.current.toggleBookmark("loc-1")
    })

    expect(result.current.bookmarks).toEqual([])
    expect(result.current.savedCount).toBe(0)
    expect(result.current.isBookmarked("loc-1")).toBe(false)
  })

  it("can clear all bookmarks", () => {
    const { result } = renderHook(() => useBookmarks())

    act(() => {
      result.current.toggleBookmark("loc-1")
      result.current.toggleBookmark("loc-2")
    })

    expect(result.current.savedCount).toBe(2)

    act(() => {
      result.current.clearBookmarks()
    })

    expect(result.current.bookmarks).toEqual([])
    expect(result.current.savedCount).toBe(0)
  })
})
