"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"

const STORAGE_KEY = "ddu_saved_locations"

let listeners: (() => void)[] = []

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function getStoredBookmarksSnapshot(): string {
  if (typeof window === "undefined") return "[]"
  try {
    return window.localStorage.getItem(STORAGE_KEY) || "[]"
  } catch {
    return "[]"
  }
}

function getStoredBookmarksServerSnapshot(): string {
  return "[]"
}

function subscribe(listener: () => void) {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

export function useBookmarks() {
  const rawBookmarks = useSyncExternalStore(
    subscribe,
    getStoredBookmarksSnapshot,
    getStoredBookmarksServerSnapshot
  )

  const bookmarks = useMemo(() => {
    try {
      const parsed = JSON.parse(rawBookmarks)
      if (Array.isArray(parsed)) {
        return parsed as string[]
      }
    } catch {
      // fallback
    }
    return []
  }, [rawBookmarks])

  const isBookmarked = useCallback(
    (id: string) => bookmarks.includes(id),
    [bookmarks]
  )

  const toggleBookmark = useCallback((id: string) => {
    if (typeof window === "undefined") return
    try {
      const current = JSON.parse(
        window.localStorage.getItem(STORAGE_KEY) || "[]"
      ) as string[]
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      emitChange()
    } catch {
      // ignore storage errors
    }
  }, [])

  const clearBookmarks = useCallback(() => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.removeItem(STORAGE_KEY)
      emitChange()
    } catch {
      // ignore storage errors
    }
  }, [])

  return {
    bookmarks,
    isBookmarked,
    toggleBookmark,
    clearBookmarks,
    savedCount: bookmarks.length,
  }
}
