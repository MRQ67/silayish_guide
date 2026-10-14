import L from "leaflet"

let isFixed = false

/**
 * Fixes the classic Leaflet marker icon asset resolution issue in Next.js/Turbopack
 * by replacing the dynamic _getIconUrl with explicit asset URLs.
 */
export function fixLeafletDefaultIcon(): void {
  if (isFixed || typeof window === "undefined") {
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl

  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  })

  isFixed = true
}
