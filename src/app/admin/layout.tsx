import type { ReactNode } from "react"

export const instant = false

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
