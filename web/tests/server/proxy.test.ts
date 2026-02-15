/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { getRedirectUrl, unstable_doesMiddlewareMatch } from "next/experimental/testing/server"

import { config, proxy } from "@/proxy"

const getUserMock = vi.fn()
type CookieAdapter = {
  get: (name: string) => string | undefined
  set: (name: string, value: string, options: Record<string, unknown>) => void
  remove: (name: string, options: Record<string, unknown>) => void
}

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_, __, options: { cookies: CookieAdapter }) => {
    options.cookies.get("sb-access-token")
    options.cookies.set("sb-access-token", "next-token", { path: "/" })
    options.cookies.remove("sb-access-token", { path: "/" })
    return {
      auth: {
        getUser: getUserMock,
      },
    }
  }),
}))

describe("proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon"
  })

  it("returns next response when supabase env is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const response = await proxy(new NextRequest("http://localhost/dashboard"))
    expect(getRedirectUrl(response)).toBeNull()
    expect(response.status).toBe(200)
  })

  it("matches business routes and skips static assets", () => {
    expect(unstable_doesMiddlewareMatch({ config, url: "/dashboard" })).toBe(true)
    expect(unstable_doesMiddlewareMatch({ config, url: "/login" })).toBe(true)
    expect(unstable_doesMiddlewareMatch({ config, url: "/_next/static/chunks/main.js" })).toBe(false)
    expect(unstable_doesMiddlewareMatch({ config, url: "/favicon.ico" })).toBe(false)
    expect(unstable_doesMiddlewareMatch({ config, url: "/image.webp" })).toBe(false)
  })

  it("redirects authenticated user away from login to sanitized destination", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    })

    const response = await proxy(new NextRequest("http://localhost/login?redirectTo=/assessment"))
    expect(getRedirectUrl(response)).toBe("http://localhost/assessment")
  })

  it("redirects unauthenticated user from protected routes to login", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })

    const response = await proxy(new NextRequest("http://localhost/learning-path?tab=recent"))
    const redirectUrl = getRedirectUrl(response)
    expect(redirectUrl).not.toBeNull()

    const url = new URL(redirectUrl ?? "http://localhost/login")
    expect(url.pathname).toBe("/login")
    expect(url.searchParams.get("redirectTo")).toBe("/learning-path?tab=recent")
  })

  it("allows public paths for unauthenticated users", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })

    const response = await proxy(new NextRequest("http://localhost/callback?redirectTo=/dashboard"))
    expect(getRedirectUrl(response)).toBeNull()
    expect(response.status).toBe(200)
  })

  it("allows authenticated users on protected routes", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: "user-2" } },
      error: null,
    })

    const response = await proxy(new NextRequest("http://localhost/dashboard"))
    expect(getRedirectUrl(response)).toBeNull()
    expect(response.status).toBe(200)
  })
})
