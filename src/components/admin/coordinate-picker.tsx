"use client"

import dynamic from "next/dynamic"

const CoordinatePickerMap = dynamic(() => import("./coordinate-picker-map"), {
  ssr: false,
  loading: () => (
    <div className="h-56 animate-pulse rounded-md border border-border bg-muted/50" />
  ),
})

export function CoordinatePicker({
  value,
  onChange,
}: {
  value: [number, number] | null
  onChange: (point: [number, number]) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Set location on map</p>
      <p className="text-xs text-muted-foreground">
        Click the map to place the marker, then drag it to refine the position.
        You can also enter coordinates above.
      </p>
      <CoordinatePickerMap value={value} onChange={onChange} />
    </div>
  )
}
