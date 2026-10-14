import { cn } from "@/lib/utils"

export interface CodeBadgeProps {
  code?: string | null
  className?: string
}

/**
 * Renders a campus building code in a stencil font with a bold, high-contrast,
 * painted wall signage appearance. Renders nothing when code is null or empty.
 */
export function CodeBadge({ code, className }: CodeBadgeProps) {
  if (!code) {
    return null
  }

  return (
    <span
      data-testid="code-badge"
      className={cn(
        "font-stencil inline-flex shrink-0 items-center rounded border-2 border-zinc-950 bg-amber-300 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-zinc-950 shadow-xs dark:border-amber-400 dark:bg-zinc-950 dark:text-amber-400",
        className
      )}
    >
      {code}
    </span>
  )
}
