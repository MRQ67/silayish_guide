import L from "leaflet"
import type { Category } from "./types"
import { resolveCategoryStyle } from "./category-style"
export {
  getCategoryBadgeClasses,
  type CategoryBadgeClasses,
} from "./category-badge-utils"

export interface CategoryPinConfig {
  color: string
  iconSvg: string
}
const ICONS: Record<string, string> = {
  "graduation-cap": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m2 10 10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  "building-2": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18M6 12H4a2 2 0 0 0-2 2v8h20v-8a2 2 0 0 0-2-2h-2M10 6h4m-4 4h4m-4 4h4m-4 4h4"/></svg>`,
  users: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m16 0v-2a4 4 0 0 0-3-3.87M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0m9 2a4 4 0 0 1-3 3.87"/></svg>`,
  "heart-pulse": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/><path d="M3 12h4l2-3 3 6 2-3h7"/></svg>`,
}
const DEFAULT_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`

export function getCategoryPinConfig(
  category?: Category | string | null
): CategoryPinConfig {
  const name = typeof category === "string" ? category : category?.name
  const icon =
    typeof category === "string" ? "" : category?.icon?.trim().toLowerCase()
  const legacyIcon = name?.toLowerCase().includes("acad")
    ? "graduation-cap"
    : name?.toLowerCase().includes("admin")
      ? "building-2"
      : name?.toLowerCase().includes("health")
        ? "heart-pulse"
        : name?.toLowerCase().includes("student")
          ? "users"
          : ""
  return {
    color: resolveCategoryStyle(category).color,
    iconSvg: ICONS[icon || legacyIcon] ?? DEFAULT_ICON,
  }
}

const iconCache = new Map<string, L.DivIcon>()
export function createCategoryPinIcon(
  category?: Category | string | null,
  isSelected = false
): L.DivIcon {
  const config = getCategoryPinConfig(category)
  const key = `${config.color}:${config.iconSvg}:${isSelected}`
  const cached = iconCache.get(key)
  if (cached) return cached
  const size = isSelected ? 36 : 30
  const height = isSelected ? 44 : 38
  const html = `<div class="relative flex flex-col items-center cursor-pointer"><div style="background-color:${config.color};width:${size}px;height:${size}px" class="flex items-center justify-center rounded-full border-2 border-white text-white shadow-md">${config.iconSvg}</div><div style="border-top-color:${config.color}" class="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] -mt-[1px]"></div></div>`
  const icon = L.divIcon({
    className: "category-marker-pin !bg-transparent !border-0",
    html,
    iconSize: [size, height],
    iconAnchor: [size / 2, height],
    popupAnchor: [0, -height + 4],
  })
  iconCache.set(key, icon)
  return icon
}
