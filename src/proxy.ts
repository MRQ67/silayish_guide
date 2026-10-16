import { NextResponse, type NextRequest } from "next/server"
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import type { Database } from "@/lib/supabase/database.types"
import { verifyAdmin } from "@/lib/auth"
import { redirectWithCookies } from "@/lib/proxy-utils"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // The login page itself is public to visitors attempting authentication
  if (pathname === "/admin/login") {
    return NextResponse.next()
  }

  // Intercept all other /admin routes
  if (pathname.startsWith("/admin")) {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabasePublishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl || !supabasePublishableKey) {
      const loginUrl = new URL("/admin/login", request.url)
      return redirectWithCookies(loginUrl, response)
    }

    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabasePublishableKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(
            cookiesToSet: {
              name: string
              value: string
              options: CookieOptions
            }[]
          ) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            response = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const adminCheck = await verifyAdmin(supabase)

    if (!adminCheck.isAdmin) {
      const loginUrl = new URL("/admin/login", request.url)
      loginUrl.searchParams.set("error", "not_authorized")
      return redirectWithCookies(loginUrl, response)
    }

    if (pathname === "/admin" || pathname === "/admin/") {
      const locationsUrl = new URL("/admin/locations", request.url)
      return redirectWithCookies(locationsUrl, response)
    }

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
