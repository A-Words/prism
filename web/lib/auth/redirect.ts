const DEFAULT_REDIRECT = "/dashboard"

function normalizeFallback(fallback: string): string {
  if (fallback.startsWith("/") && !fallback.startsWith("//")) {
    return fallback
  }
  return DEFAULT_REDIRECT
}

export function sanitizeRedirectTo(input: string | null | undefined, fallback = DEFAULT_REDIRECT): string {
  const safeFallback = normalizeFallback(fallback)
  if (!input) {
    return safeFallback
  }

  const candidate = input.trim()
  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return safeFallback
  }

  try {
    const parsed = new URL(candidate, "http://localhost")
    if (parsed.origin !== "http://localhost") {
      return safeFallback
    }

    const normalizedPath = `${parsed.pathname}${parsed.search}`
    if (!normalizedPath.startsWith("/") || normalizedPath.startsWith("//")) {
      return safeFallback
    }
    return normalizedPath
  } catch {
    return safeFallback
  }
}
