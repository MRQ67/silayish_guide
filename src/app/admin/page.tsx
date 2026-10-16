import { redirect } from "next/navigation"
import { connection } from "next/server"
import { requireAdmin } from "@/lib/auth"

export const instant = false

export default async function AdminRootPage() {
  await connection()
  await requireAdmin()
  redirect("/admin/locations")
}
