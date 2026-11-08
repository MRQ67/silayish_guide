import type { Category } from "./types"
import type { CSSProperties } from "react"
import { resolveCategoryStyle } from "./category-style"

export interface CategoryBadgeClasses {
  bg: string
  text: string
  border?: string
  style?: CSSProperties
}
export function getCategoryBadgeClasses(
  category?: Category | string | null
): CategoryBadgeClasses {
  const style = resolveCategoryStyle(category)
  const name =
    (typeof category === "string" ? category : category?.name)?.toLowerCase() ??
    ""
  const palette =
    name.includes("acad") || name.includes("school") || name.includes("college")
      ? "blue"
      : name.includes("admin") || name.includes("office")
        ? "emerald"
        : ["health", "clinic", "medical", "hospital"].some((term) =>
              name.includes(term)
            )
          ? "rose"
          : ["lib", "dorm", "student"].some((term) => name.includes(term))
            ? "purple"
            : "slate"
  const classPalette: Record<string, [string, string, string]> = {
    blue: [
      "bg-blue-50 dark:bg-blue-950/60",
      "text-blue-600 dark:text-blue-400",
      "border-blue-200 dark:border-blue-900/60",
    ],
    emerald: [
      "bg-emerald-50 dark:bg-emerald-950/60",
      "text-emerald-700 dark:text-emerald-400",
      "border-emerald-200 dark:border-emerald-900/60",
    ],
    rose: [
      "bg-rose-50 dark:bg-rose-950/60",
      "text-rose-600 dark:text-rose-400",
      "border-rose-200 dark:border-rose-900/60",
    ],
    purple: [
      "bg-purple-50 dark:bg-purple-950/60",
      "text-purple-600 dark:text-purple-400",
      "border-purple-200 dark:border-purple-900/60",
    ],
    slate: [
      "bg-slate-100 dark:bg-slate-800",
      "text-slate-600 dark:text-slate-300",
      "border-slate-200 dark:border-slate-700",
    ],
  }
  const [bg, text, border] = classPalette[palette]
  return {
    bg,
    text,
    border,
    style: {
      backgroundColor: style.badgeBackground,
      color: style.badgeText,
      borderColor: style.badgeBorder,
    },
  }
}
