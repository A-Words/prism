/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

import { GET } from "@/app/(auth)/callback/route"

const exchangeCodeForSessionMock = vi.fn()
type CookieAdapter = {
  get: (name: string) => string | undefined
  set: (name: string, value: string, options: Record<string, unknown>) => void
  remove: (name: string, options: Record<string, unknown>) => void
}

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_, __, options: { cookies: CookieAdapter }) => {
    options.cookies.get("sb-refresh-token")
    options.cookies.set("sb-refresh-token", "new-refresh-token", { path: "/" })
    options.cookies.remove("sb-refresh-token", { path: "/" })
    return {
      auth: {
        exchangeCodeForSession: exchangeCodeForSessionMock,
      },
    }
  }),
}))

describe("GET /callback", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon"
    process.env.SITE_URL = "http://localhost:3000"
    exchangeCodeForSessionMock.mockResolvedValue({ error: null })
  })

  it("returns 500 when SITE_URL is missing or invalid", async () => {
    delete process.env.SITE_URL
    const response = await GET(new Request("http://localhost:3000/callback"))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: "Missing or invalid SITE_URL for callback",
    })
  })

  it("returns 500 when SITE_URL format is invalid", async () => {
    process.env.SITE_URL = "not-a-valid-url"
    const response = await GET(new Request("http://localhost:3000/callback"))

    expect(response.status).toBe(500)
  })

  it("redirects to login when Supabase env vars are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const response = await GET(new Request("http://localhost:3000/callback?redirectTo=/assessment"))
    const location = response.headers.get("location")

    expect(response.status).toBe(307)
    expect(location).toContain("/login")
    expect(location).toContain("error=Missing+Supabase+env+for+callback")
  })

  it("redirects back to login with error when code exchange fails", async () => {
    exchangeCodeForSessionMock.mockResolvedValueOnce({
      error: { message: "invalid code" },
    })

    const response = await GET(new Request("http://localhost:3000/callback?code=abc&redirectTo=/learning-path"))
    const location = response.headers.get("location")

    expect(response.status).toBe(307)
    expect(location).toContain("/login")
    expect(location).toContain("error=invalid+code")
    expect(location).toContain("redirectTo=%2Flearning-path")
  })

  it("sanitizes redirectTo and never redirects to external origin", async () => {
    const response = await GET(new Request("http://localhost:3000/callback?redirectTo=//evil.com"))

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard")
  })
})
