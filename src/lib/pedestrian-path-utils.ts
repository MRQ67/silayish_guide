import type { PedestrianPath, Position } from "@/lib/types"

export function getActivePedestrianPaths(
  paths: readonly PedestrianPath[]
): PedestrianPath[] {
  return paths.filter((path) => path.is_active)
}

export function lineStringToLeafletPositions(
  coordinates: Position[]
): [number, number][] {
  return coordinates.map(([longitude, latitude]) => [latitude, longitude])
}
