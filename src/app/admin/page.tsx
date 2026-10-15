import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth"

export default async function AdminRootPage() {
  await requireAdmin()
  redirect("/admin/locations")
}
