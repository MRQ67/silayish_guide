import type { Category } from "./types"

export const DEFAULT_CATEGORY_COLOR = "#64748b"
const HEX_COLOR = /^#[\da-fA-F]{6}$/

export interface CategoryVisualStyle {
  color: string
  stroke: string
  fill: string
  selectedStroke: string
  badgeBackground: string
  badgeText: string
  badgeBorder: string
}

function normalizeHex(value: string | null | undefined): string | null {
  return typeof value === "string" && HEX_COLOR.test(value)
    ? value.toLowerCase()
    : null
}

function legacyColor(name?: string | null): string {
  const normalized = name?.toLowerCase() ?? ""
  if (
    normalized.includes("acad") ||
    normalized.includes("school") ||
    normalized.includes("college")
  )
    return "#2563eb"
  if (normalized.includes("admin") || normalized.includes("office"))
    return "#059669"
  if (
    ["health", "clinic", "medical", "hospital", "facilit"].some((term) =>
      normalized.includes(term)
    )
  )
    return "#f43f5e"
  if (["lib", "dorm", "student"].some((term) => normalized.includes(term)))
    return "#9333ea"
  return DEFAULT_CATEGORY_COLOR
}

function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const result = channels.map((channel) => Math.round(channel * (1 - amount)))
  return `#${result.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`
}

function tint(hex: string, amount: number): string {
  const value = Number.parseInt(hex.slice(1), 16)
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255]
  return `#${channels
    .map((channel) => Math.round(channel * amount + 255 * (1 - amount)))
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`
}

export function resolveCategoryStyle(
  category?: Category | string | null
): CategoryVisualStyle {
  const name = typeof category === "string" ? category : category?.name
  const explicitColor =
    typeof category === "object" && category
      ? normalizeHex(category.color)
      : null
  const color = explicitColor ?? legacyColor(name)
  return {
    color,
    stroke: shade(color, 0.25),
    fill: color,
    selectedStroke: shade(color, 0.4),
    badgeBackground: tint(color, 0.12),
    badgeText: "#1F2937",
    badgeBorder: `${color}55`,
  }
}

export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value)
}
