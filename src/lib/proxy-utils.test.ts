import { describe, expect, it } from "vitest"
import { NextResponse } from "next/server"
import { copyResponseCookies, redirectWithCookies } from "./proxy-utils"

describe("copyResponseCookies", () => {
  it("copies cookies with their options from source to target response", () => {
    const source = NextResponse.next()
    source.cookies.set("sb-access-token", "token-123", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 3600,
    })
    source.cookies.set("sb-refresh-token", "refresh-456", {
      httpOnly: true,
      path: "/",
    })

    const target = NextResponse.next()
    copyResponseCookies(source, target)

    const targetCookies = target.cookies.getAll()
    expect(targetCookies).toHaveLength(2)

    const accessToken = target.cookies.get("sb-access-token")
    expect(accessToken).toBeDefined()
    expect(accessToken?.value).toBe("token-123")
    expect(accessToken?.path).toBe("/")

    const refreshToken = target.cookies.get("sb-refresh-token")
    expect(refreshToken).toBeDefined()
    expect(refreshToken?.value).toBe("refresh-456")
  })

  it("handles source response with no cookies gracefully", () => {
    const source = NextResponse.next()
    const target = NextResponse.next()

    copyResponseCookies(source, target)
    expect(target.cookies.getAll()).toHaveLength(0)
  })
})

describe("redirectWithCookies", () => {
  it("creates a redirect carrying over all cookies from source response", () => {
    const source = NextResponse.next()
    source.cookies.set("session-id", "xyz-789", {
      httpOnly: true,
      path: "/",
    })

    const redirectUrl = "http://localhost:3000/admin/login?error=not_authorized"
    const redirect = redirectWithCookies(redirectUrl, source)

    expect(redirect.status).toBe(307)
    expect(redirect.headers.get("location")).toBe(redirectUrl)

    const cookie = redirect.cookies.get("session-id")
    expect(cookie).toBeDefined()
    expect(cookie?.value).toBe("xyz-789")
  })
})
