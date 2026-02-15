import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_PATHS = ["/login", "/callback", "/_next", "/favicon.ico"]

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

function hasAuthCookie(request: NextRequest) {
  const cookies = request.cookies.getAll()
  return cookies.some((cookie) => cookie.name.includes("sb-") && cookie.name.includes("auth-token"))
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  if (!hasAuthCookie(request)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirectTo", pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/assessment/:path*", "/learning-path/:path*"],
}
