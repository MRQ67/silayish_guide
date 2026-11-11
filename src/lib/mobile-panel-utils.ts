export type SheetSnap = "peek" | "half" | "full"

export interface MobilePanelBounds {
  min: number
  max: number
}

export function getMobilePanelBounds(viewportHeight: number): MobilePanelBounds {
  const height = Number.isFinite(viewportHeight) ? Math.max(1, viewportHeight) : 1
  const min = Math.min(128, Math.max(88, Math.round(height * 0.22)))
  return { min, max: Math.max(min, Math.round(height - 96)) }
}

export function clampMobilePanelHeight(
  height: number,
  viewportHeight: number
): number {
  const bounds = getMobilePanelBounds(viewportHeight)
  return Math.min(bounds.max, Math.max(bounds.min, Math.round(height)))
}

export function getNearestSheetSnap(
  height: number,
  viewportHeight: number
): SheetSnap {
  const bounds = getMobilePanelBounds(viewportHeight)
  const midpoint = clampMobilePanelHeight(viewportHeight * 0.5, viewportHeight)
  const snaps: [SheetSnap, number][] = [
    ["peek", bounds.min],
    ["half", midpoint],
    ["full", bounds.max],
  ]
  return snaps.reduce((nearest, current) =>
    Math.abs(current[1] - height) < Math.abs(nearest[1] - height)
      ? current
      : nearest
  )[0]
}
