import { Suspense } from "react"
import { LoginForm } from "@/components/admin/login-form"

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 font-sans sm:p-8">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Admin Login
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your campus administrator credentials
          </p>
        </div>

        <Suspense fallback={<div className="h-48 animate-pulse rounded-md bg-muted" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
