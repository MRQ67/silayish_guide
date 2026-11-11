"use client"

import { Polyline, Popup } from "react-leaflet"
import type { PedestrianPath } from "@/lib/types"
import {
  getActivePedestrianPaths,
  lineStringToLeafletPositions,
} from "@/lib/pedestrian-path-utils"

const PATH_TYPE_LABELS: Record<PedestrianPath["path_type"], string> = {
  walkway: "Walkway",
  ramp: "Ramp",
  stairs: "Stairs",
  other: "Path",
}

export function PedestrianPathsLayer({
  paths,
}: {
  paths: PedestrianPath[]
}) {
  return getActivePedestrianPaths(paths).map((path) => (
    <Polyline
      key={`pedestrian-path-${path.id}`}
      positions={lineStringToLeafletPositions(path.geometry.coordinates)}
      pane="pedestrianPaths"
      pathOptions={{
        color: path.wheelchair_accessible ? "#15803d" : "#475569",
        weight: 5,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round",
        dashArray: path.path_type === "stairs" ? "8 6" : undefined,
      }}
    >
      <Popup>
        <div className="min-w-36 space-y-1 font-sans text-xs">
          <p className="font-semibold">{path.name}</p>
          <p>{PATH_TYPE_LABELS[path.path_type]}</p>
          <p>
            {path.wheelchair_accessible
              ? "Wheelchair accessible"
              : "Not wheelchair accessible"}
          </p>
          {path.surface && <p>Surface: {path.surface}</p>}
          {path.notes && <p>{path.notes}</p>}
        </div>
      </Popup>
    </Polyline>
  ))
}
