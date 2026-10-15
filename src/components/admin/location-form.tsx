"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Category, Location, LocationType } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  createLocationAction,
  updateLocationAction,
} from "@/app/admin/actions"

export interface ParentBuildingOption {
  id: string
  name: string
  code: string | null
}

export interface LocationFormProps {
  initialData?: Location | null
  categories: Category[]
  buildings: ParentBuildingOption[]
}

const LOCATION_TYPES: { value: LocationType; label: string }[] = [
  { value: "building", label: "Building" },
  { value: "office", label: "Office" },
  { value: "dorm", label: "Dormitory" },
  { value: "lab", label: "Laboratory" },
  { value: "facility", label: "Facility" },
]

export function LocationForm({
  initialData,
  categories,
  buildings,
}: LocationFormProps) {
  const router = useRouter()
  const isEditing = Boolean(initialData?.id)

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    code: initialData?.code || "",
    type: (initialData?.type as LocationType) || "building",
    category_id: initialData?.category_id || "",
    parent_id: initialData?.parent_id || "",
    description: initialData?.description || "",
    lat: initialData?.lat !== null && initialData?.lat !== undefined ? String(initialData.lat) : "",
    lng: initialData?.lng !== null && initialData?.lng !== undefined ? String(initialData.lng) : "",
    floor: initialData?.floor !== null && initialData?.floor !== undefined ? String(initialData.floor) : "",
    opening_hours: initialData?.opening_hours || "",
    photo_url: initialData?.photo_url || "",
  })

  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [isPending, startTransition] = useTransition()

  // Filter out self from parent options when editing
  const eligibleBuildings = isEditing
    ? buildings.filter((b) => b.id !== initialData?.id)
    : buildings

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const payload = {
      name: formData.name,
      code: formData.code,
      type: formData.type,
      category_id: formData.category_id || null,
      parent_id: formData.parent_id || null,
      description: formData.description || null,
      lat: formData.lat || null,
      lng: formData.lng || null,
      floor: formData.floor || null,
      opening_hours: formData.opening_hours || null,
      photo_url: formData.photo_url || null,
    }

    startTransition(async () => {
      const result = isEditing
        ? await updateLocationAction(initialData!.id, payload)
        : await createLocationAction(payload)

      if (!result.success) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors)
        }
        if (result.error) {
          setError(result.error)
        }
      } else {
        router.push("/admin/locations")
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Name */}
        <div className="sm:col-span-2">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-foreground"
          >
            Location name <span className="text-destructive">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="e.g. Science Complex"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
          />
          {fieldErrors.name && (
            <p className="mt-1 text-xs text-destructive">
              {fieldErrors.name[0]}
            </p>
          )}
        </div>

        {/* Code */}
        <div>
          <label
            htmlFor="code"
            className="block text-sm font-medium text-foreground"
          >
            Building code (painted signage)
          </label>
          <input
            id="code"
            type="text"
            maxLength={20}
            value={formData.code}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, code: e.target.value }))
            }
            placeholder="e.g. B-002"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none uppercase"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            1 to 20 uppercase characters, or blank if unassigned.
          </p>
          {fieldErrors.code && (
            <p className="mt-1 text-xs text-destructive">
              {fieldErrors.code[0]}
            </p>
          )}
        </div>

        {/* Type */}
        <div>
          <label
            htmlFor="type"
            className="block text-sm font-medium text-foreground"
          >
            Location type <span className="text-destructive">*</span>
          </label>
          <select
            id="type"
            required
            value={formData.type}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                type: e.target.value as LocationType,
              }))
            }
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
          >
            {LOCATION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {fieldErrors.type && (
            <p className="mt-1 text-xs text-destructive">
              {fieldErrors.type[0]}
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <label
            htmlFor="category_id"
            className="block text-sm font-medium text-foreground"
          >
            Category
          </label>
          <select
            id="category_id"
            value={formData.category_id}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, category_id: e.target.value }))
            }
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
          >
            <option value="">None</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Parent Building */}
        <div>
          <label
            htmlFor="parent_id"
            className="block text-sm font-medium text-foreground"
          >
            Parent building
          </label>
          <select
            id="parent_id"
            value={formData.parent_id}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, parent_id: e.target.value }))
            }
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
          >
            <option value="">None (Standalone)</option>
            {eligibleBuildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} {b.code ? `(${b.code})` : ""}
              </option>
            ))}
          </select>
          {fieldErrors.parent_id && (
            <p className="mt-1 text-xs text-destructive">
              {fieldErrors.parent_id[0]}
            </p>
          )}
        </div>

        {/* Floor */}
        <div>
          <label
            htmlFor="floor"
            className="block text-sm font-medium text-foreground"
          >
            Floor number
          </label>
          <input
            id="floor"
            type="number"
            step="1"
            value={formData.floor}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, floor: e.target.value }))
            }
            placeholder="e.g. 2"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
          />
          {fieldErrors.floor && (
            <p className="mt-1 text-xs text-destructive">
              {fieldErrors.floor[0]}
            </p>
          )}
        </div>

        {/* Opening Hours */}
        <div>
          <label
            htmlFor="opening_hours"
            className="block text-sm font-medium text-foreground"
          >
            Opening hours
          </label>
          <input
            id="opening_hours"
            type="text"
            value={formData.opening_hours}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                opening_hours: e.target.value,
              }))
            }
            placeholder="e.g. Mon-Fri 8:00 AM - 5:00 PM"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
          />
        </div>

        {/* Latitude */}
        <div>
          <label
            htmlFor="lat"
            className="block text-sm font-medium text-foreground"
          >
            Latitude (-90 to 90)
          </label>
          <input
            id="lat"
            type="number"
            step="any"
            value={formData.lat}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, lat: e.target.value }))
            }
            placeholder="e.g. 9.5934"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
          />
          {fieldErrors.lat && (
            <p className="mt-1 text-xs text-destructive">
              {fieldErrors.lat[0]}
            </p>
          )}
        </div>

        {/* Longitude */}
        <div>
          <label
            htmlFor="lng"
            className="block text-sm font-medium text-foreground"
          >
            Longitude (-180 to 180)
          </label>
          <input
            id="lng"
            type="number"
            step="any"
            value={formData.lng}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, lng: e.target.value }))
            }
            placeholder="e.g. 41.8596"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
          />
          {fieldErrors.lng && (
            <p className="mt-1 text-xs text-destructive">
              {fieldErrors.lng[0]}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="sm:col-span-2">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-foreground"
          >
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Brief details about facilities, departments, or entrance points..."
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
          />
        </div>

        {/* Photo URL */}
        <div className="sm:col-span-2">
          <label
            htmlFor="photo_url"
            className="block text-sm font-medium text-foreground"
          >
            Photo URL
          </label>
          <input
            id="photo_url"
            type="text"
            value={formData.photo_url}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, photo_url: e.target.value }))
            }
            placeholder="https://example.com/images/building.jpg"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
        <Link href="/admin/locations">
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? isEditing
              ? "Saving changes..."
              : "Creating location..."
            : isEditing
              ? "Save changes"
              : "Create location"}
        </Button>
      </div>
    </form>
  )
}
