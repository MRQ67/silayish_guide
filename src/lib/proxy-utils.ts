import { NextResponse } from "next/server"

/**
 * Copies all cookies from a source response onto a target response.
 * Preserves cookie name, value, and attributes (path, domain, maxAge, sameSite, httpOnly, secure).
 */
export function copyResponseCookies(
  source: NextResponse,
  target: NextResponse
): NextResponse {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie)
  }
  return target
}

/**
 * Creates a redirect response that preserves refreshed session cookies
 * from the in-flight proxy response.
 */
export function redirectWithCookies(
  url: string | URL,
  sourceResponse: NextResponse,
  status?: number
): NextResponse {
  const redirectResponse = NextResponse.redirect(url, status)
  return copyResponseCookies(sourceResponse, redirectResponse)
}
