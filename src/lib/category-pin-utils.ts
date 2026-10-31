import L from "leaflet"

export interface CategoryPinConfig {
  color: string
  iconSvg: string
}

const SVG_ICONS = {
  graduationCap: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  landmark: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18"/><line x1="10" x2="10" y1="18"/><line x1="14" x2="14" y1="18"/><line x1="18" x2="18" y1="18"/><polygon points="12 2 20 7 4 7"/></svg>`,
  heartPulse: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
  book: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 2v20"/></svg>`,
  pin: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`,
}

export function getCategoryPinConfig(
  categoryName?: string | null
): CategoryPinConfig {
  if (!categoryName) {
    return {
      color: "#64748b", // Slate
      iconSvg: SVG_ICONS.pin,
    }
  }

  const name = categoryName.toLowerCase().trim()

  if (name.includes("acad") || name.includes("school") || name.includes("college")) {
    return {
      color: "#2563eb", // Blue
      iconSvg: SVG_ICONS.graduationCap,
    }
  }

  if (name.includes("admin") || name.includes("office")) {
    return {
      color: "#059669", // Emerald
      iconSvg: SVG_ICONS.landmark,
    }
  }

  if (
    name.includes("health") ||
    name.includes("clinic") ||
    name.includes("medical") ||
    name.includes("hospital")
  ) {
    return {
      color: "#f43f5e", // Rose / Coral (Mockup style)
      iconSvg: SVG_ICONS.heartPulse,
    }
  }

  if (
    name.includes("lib") ||
    name.includes("dorm") ||
    name.includes("student")
  ) {
    return {
      color: "#9333ea", // Purple
      iconSvg: SVG_ICONS.book,
    }
  }

  return {
    color: "#64748b",
    iconSvg: SVG_ICONS.pin,
  }
}

/**
 * Creates a Leaflet divIcon representing a modern category-colored pin marker
 */
export function createCategoryPinIcon(
  categoryName?: string | null,
  isSelected = false
): L.DivIcon {
  const config = getCategoryPinConfig(categoryName)
  const size = isSelected ? 36 : 30
  const totalHeight = isSelected ? 44 : 38
  const halfSize = Math.round(size / 2)

  const glowClass = isSelected
    ? "ring-4 ring-primary/40 scale-110 shadow-xl"
    : "shadow-md hover:scale-105"

  const html = `
    <div class="relative flex flex-col items-center cursor-pointer transition-transform duration-200">
      <div style="background-color: ${config.color}; width: ${size}px; height: ${size}px;"
           class="flex items-center justify-center rounded-full border-2 border-white text-white ${glowClass}">
        ${config.iconSvg}
      </div>
      <div style="border-top-color: ${config.color};"
           class="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] -mt-[1px]">
      </div>
    </div>
  `

  return L.divIcon({
    className: "category-marker-pin !bg-transparent !border-0",
    html,
    iconSize: [size, totalHeight],
    iconAnchor: [halfSize, totalHeight],
    popupAnchor: [0, -totalHeight + 4],
  })
}
