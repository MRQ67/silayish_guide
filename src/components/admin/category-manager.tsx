"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { Category } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  deleteCategoryAction,
  saveCategoryAction,
} from "@/app/admin/category-actions"

export function CategoryManager({
  categories,
  usage,
}: {
  categories: Category[]
  usage: Record<string, number>
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName] = useState("")
  const [icon, setIcon] = useState("")
  const [color, setColor] = useState("#64748B")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function begin(category?: Category) {
    setEditing(category ?? null)
    setName(category?.name ?? "")
    setIcon(category?.icon ?? "")
    setColor(category?.color ?? "#64748B")
    setError("")
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    startTransition(async () => {
      const result = await saveCategoryAction({
        id: editing?.id,
        name,
        icon: icon || null,
        color,
      })
      if (!result.success)
        setError(
          result.error ??
            Object.values(result.fieldErrors ?? {}).flat()[0] ??
            "Unable to save category."
        )
      else {
        begin()
        router.refresh()
      }
    })
  }

  function remove(category: Category) {
    if (!window.confirm(`Delete category "${category.name}"?`)) return
    setError("")
    startTransition(async () => {
      const result = await deleteCategoryAction(category.id)
      if (!result.success)
        setError(result.error ?? "Unable to delete category.")
      else router.refresh()
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Icon</th>
              <th className="px-4 py-3">Color</th>
              <th className="px-4 py-3">Locations</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categories.map((category) => (
              <tr key={category.id}>
                <td className="px-4 py-3 font-medium">{category.name}</td>
                <td className="px-4 py-3">{category.icon || "Default"}</td>
                <td className="px-4 py-3">
                  <span
                    className="mr-2 inline-block h-4 w-4 rounded border align-middle"
                    style={{ backgroundColor: category.color || "#64748B" }}
                  />
                  {category.color || "Fallback"}
                </td>
                <td className="px-4 py-3">{usage[category.id] ?? 0}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => begin(category)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={pending || (usage[category.id] ?? 0) > 0}
                      onClick={() => remove(category)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!categories.length && (
          <p className="p-6 text-sm text-muted-foreground">
            No categories yet.
          </p>
        )}
      </section>
      <form
        onSubmit={save}
        className="h-fit space-y-4 rounded-lg border border-border bg-card p-5"
      >
        <h2 className="font-semibold">
          {editing ? "Edit category" : "New category"}
        </h2>
        {error && (
          <div
            role="alert"
            className="rounded border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}
        <label className="block text-sm">
          Name
          <input
            required
            maxLength={60}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Icon name
          <input
            maxLength={40}
            value={icon}
            onChange={(event) => setIcon(event.target.value)}
            placeholder="graduation-cap"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Supported icons include graduation-cap, building-2, users, and
            heart-pulse.
          </span>
        </label>
        <label className="block text-sm">
          Color
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value.toUpperCase())}
            className="mt-1 block h-10 w-full rounded-md border border-input bg-background p-1"
          />
        </label>
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : editing ? "Save changes" : "Create category"}
          </Button>
          {editing && (
            <Button type="button" variant="outline" onClick={() => begin()}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
