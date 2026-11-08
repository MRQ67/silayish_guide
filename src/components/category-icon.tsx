import {
  Building2,
  GraduationCap,
  HeartPulse,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react"
import type { CSSProperties } from "react"

export interface CategoryIconProps {
  iconName?: string | null
  className?: string
  style?: CSSProperties
}

const ICON_MAP: Record<string, LucideIcon> = {
  "graduation-cap": GraduationCap,
  "building-2": Building2,
  users: Users,
  "heart-pulse": HeartPulse,
}

export function CategoryIcon({
  iconName,
  className = "h-3.5 w-3.5",
  style,
}: CategoryIconProps) {
  const IconComponent =
    (iconName && ICON_MAP[iconName.trim().toLowerCase()]) || Tag
  return (
    <IconComponent className={className} style={style} aria-hidden="true" />
  )
}
