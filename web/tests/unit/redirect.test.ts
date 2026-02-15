import { describe, expect, it } from "vitest"

import { sanitizeRedirectTo } from "@/lib/auth/redirect"

describe("sanitizeRedirectTo", () => {
  it("returns fallback for nullish or empty input", () => {
    expect(sanitizeRedirectTo(undefined)).toBe("/dashboard")
    expect(sanitizeRedirectTo(null, "/assessment")).toBe("/assessment")
    expect(sanitizeRedirectTo("")).toBe("/dashboard")
    expect(sanitizeRedirectTo("   ", "/learning-path")).toBe("/learning-path")
  })

  it("rejects protocol-relative and absolute external urls", () => {
    expect(sanitizeRedirectTo("//evil.com", "/dashboard")).toBe("/dashboard")
    expect(sanitizeRedirectTo("https://evil.com/path", "/dashboard")).toBe("/dashboard")
  })

  it("keeps relative path with query", () => {
    expect(sanitizeRedirectTo("/dashboard?a=1&b=2")).toBe("/dashboard?a=1&b=2")
  })

  it("falls back to /dashboard when fallback itself is invalid", () => {
    expect(sanitizeRedirectTo(undefined, "https://evil.com")).toBe("/dashboard")
    expect(sanitizeRedirectTo(undefined, "//evil.com")).toBe("/dashboard")
    expect(sanitizeRedirectTo(undefined, "not-a-path")).toBe("/dashboard")
  })
})
