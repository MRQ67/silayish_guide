export interface CategoryBadgeClasses {
  bg: string
  text: string
  border?: string
}

/**
 * Returns Tailwind color classes for category squircle icons and chips.
 * Pure utility without Leaflet or DOM dependencies for SSR safety.
 */
export function getCategoryBadgeClasses(
  categoryName?: string | null
): CategoryBadgeClasses {
  if (!categoryName) {
    return {
      bg: "bg-slate-100 dark:bg-slate-800",
      text: "text-slate-600 dark:text-slate-300",
      border: "border-slate-200 dark:border-slate-700",
    }
  }

  const name = categoryName.toLowerCase().trim()

  if (name.includes("acad") || name.includes("school") || name.includes("college")) {
    return {
      bg: "bg-blue-50 dark:bg-blue-950/60",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-900/60",
    }
  }

  if (name.includes("admin") || name.includes("office")) {
    return {
      bg: "bg-emerald-50 dark:bg-emerald-950/60",
      text: "text-emerald-700 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-900/60",
    }
  }

  if (
    name.includes("health") ||
    name.includes("clinic") ||
    name.includes("medical") ||
    name.includes("hospital")
  ) {
    return {
      bg: "bg-rose-50 dark:bg-rose-950/60",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-200 dark:border-rose-900/60",
    }
  }

  if (
    name.includes("lib") ||
    name.includes("dorm") ||
    name.includes("student")
  ) {
    return {
      bg: "bg-purple-50 dark:bg-purple-950/60",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-200 dark:border-purple-900/60",
    }
  }

  return {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
  }
}
