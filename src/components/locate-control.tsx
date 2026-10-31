"use client"

import { useState } from "react"
import { Circle, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import { Navigation } from "lucide-react"
import { cn } from "@/lib/utils"

export function createUserLocationIcon() {
  return L.divIcon({
    className: "user-location-marker",
    html: `
      <div class="relative flex items-center justify-center w-6 h-6">
        <span class="absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75 animate-ping"></span>
        <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-600 border-2 border-white shadow-md"></span>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

export interface LocateControlProps {
  className?: string
}

export function LocateControl({ className = "" }: LocateControlProps) {
  const map = useMap()
  const [locating, setLocating] = useState(false)
  const [userPosition, setUserPosition] = useState<[number, number] | null>(
    null
  )
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleLocate = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your browser.")
      setTimeout(() => setErrorMessage(null), 4000)
      return
    }

    setLocating(true)
    setErrorMessage(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [
          pos.coords.latitude,
          pos.coords.longitude,
        ]
        setUserPosition(coords)
        setAccuracy(pos.coords.accuracy)
        setLocating(false)

        if (map && typeof map.flyTo === "function") {
          map.flyTo(coords, Math.max(map.getZoom(), 17), {
            animate: true,
            duration: 1.2,
          })
        }
      },
      (err) => {
        setLocating(false)
        if (err.code === 1) {
          // PERMISSION_DENIED
          setErrorMessage(
            "Location access was denied. Please allow location permissions."
          )
        } else if (err.code === 2) {
          // POSITION_UNAVAILABLE
          setErrorMessage(
            "Location unavailable. Please check your GPS signal."
          )
        } else if (err.code === 3) {
          // TIMEOUT
          setErrorMessage("Location request timed out. Please try again.")
        } else {
          setErrorMessage("Unable to determine your location.")
        }
        setTimeout(() => setErrorMessage(null), 5000)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    )
  }

  return (
    <>
      {userPosition && (
        <>
          {accuracy && (
            <Circle
              center={userPosition}
              radius={accuracy}
              pathOptions={{
                color: "#3b82f6",
                fillColor: "#3b82f6",
                fillOpacity: 0.15,
                weight: 1,
              }}
            />
          )}
          <Marker position={userPosition} icon={createUserLocationIcon()}>
            <Popup>
              <div className="font-sans text-xs">
                <p className="font-semibold text-foreground">You are here</p>
                {accuracy && (
                  <p className="text-[11px] text-muted-foreground">
                    Accurate to ±{Math.round(accuracy)} meters
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        </>
      )}

      <div
        className={cn(
          "absolute bottom-5 right-4 z-[400] flex flex-col items-end gap-1.5",
          className
        )}
      >
        {errorMessage && (
          <div
            role="alert"
            data-testid="locate-error"
            className="max-w-[220px] rounded-md bg-destructive/90 px-2.5 py-1.5 text-xs text-destructive-foreground shadow-md backdrop-blur"
          >
            {errorMessage}
          </div>
        )}
        <button
          type="button"
          data-testid="locate-me-button"
          onClick={handleLocate}
          disabled={locating}
          aria-label={
            locating ? "Locating your position..." : "Locate me on campus"
          }
          title="Locate me on campus"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card shadow-md transition-all hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
            userPosition ? "border-primary text-primary" : "text-foreground"
          )}
        >
          {locating ? (
            <span
              data-testid="locate-spinner"
              className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
            />
          ) : (
            <Navigation
              className={cn(
                "h-4 w-4 transition-transform",
                userPosition && "fill-primary"
              )}
              aria-hidden="true"
            />
          )}
        </button>
      </div>
    </>
  )
}
