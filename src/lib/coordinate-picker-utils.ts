export type CoordinatePair = [number, number] | null

export function toCoordinatePair(lat: string, lng: string): CoordinatePair {
  if (!lat.trim() || !lng.trim()) return null
  const parsedLat = Number(lat)
  const parsedLng = Number(lng)
  if (
    !Number.isFinite(parsedLat) ||
    !Number.isFinite(parsedLng) ||
    parsedLat < -90 ||
    parsedLat > 90 ||
    parsedLng < -180 ||
    parsedLng > 180
  )
    return null
  return [parsedLat, parsedLng]
}

export function fromCoordinatePair(point: [number, number]): {
  lat: string
  lng: string
} {
  return { lat: String(point[0]), lng: String(point[1]) }
}
