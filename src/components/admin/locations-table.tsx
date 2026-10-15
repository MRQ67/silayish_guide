"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Location } from "@/lib/types"
import { searchLocations } from "@/lib/search"
import { CodeBadge } from "@/components/code-badge"
import { Button } from "@/components/ui/button"
import { deleteLocationAction } from "@/app/admin/actions"

export interface AdminLocationItem extends Location {
  parent?: {
    id: string
    name: string
    code?: string | null
  } | null
}

export interface LocationsTableProps {
  initialLocations: AdminLocationItem[]
}

export function LocationsTable({ initialLocations }: LocationsTableProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const displayedLocations = query.trim()
    ? (searchLocations(initialLocations, query) as AdminLocationItem[])
    : initialLocations

  const handleDelete = (location: AdminLocationItem) => {
    const message = `Are you sure you want to delete "${location.name}"? This action cannot be undone.`
    if (!window.confirm(message)) {
      return
    }

    setError(null)
    setDeletingId(location.id)

    startTransition(async () => {
      const result = await deleteLocationAction(location.id)
      setDeletingId(null)

      if (!result.success) {
        setError(result.error || "Failed to delete location.")
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, description, or code (e.g. B-002)..."
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
          />
        </div>

        <Link href="/admin/locations/new">
          <Button>+ New location</Button>
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">Code</th>
              <th scope="col" className="px-4 py-3">Name</th>
              <th scope="col" className="px-4 py-3">Type</th>
              <th scope="col" className="px-4 py-3">Category</th>
              <th scope="col" className="px-4 py-3">Building (Parent)</th>
              <th scope="col" className="px-4 py-3">Floor</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayedLocations.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  {query.trim()
                    ? `No locations match "${query}"`
                    : "No locations found. Click '+ New location' to create one."}
                </td>
              </tr>
            ) : (
              displayedLocations.map((loc) => (
                <tr key={loc.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <CodeBadge code={loc.code} />
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {loc.name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">
                    {loc.type}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {loc.category?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {loc.parent?.name ? (
                      <span className="flex items-center gap-1.5">
                        {loc.parent.name}
                        {loc.parent.code && (
                          <span className="text-xs text-muted-foreground">
                            ({loc.parent.code})
                          </span>
                        )}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {loc.floor !== null && loc.floor !== undefined
                      ? loc.floor
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/locations/${loc.id}/edit`}>
                        <Button variant="outline" size="xs">
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="xs"
                        disabled={isPending && deletingId === loc.id}
                        onClick={() => handleDelete(loc)}
                      >
                        {isPending && deletingId === loc.id
                          ? "Deleting..."
                          : "Delete"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
