import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { sanitizeRedirectTo } from "@/lib/auth/redirect"

const PUBLIC_PATHS = ["/login", "/callback"]

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie)
  })
}

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next()
  }

  const { pathname, search } = request.nextUrl
  const response = NextResponse.next()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: { [key: string]: unknown }) {
        request.cookies.set(name, value)
        response.cookies.set(name, value, options)
      },
      remove(name: string, options: { [key: string]: unknown }) {
        request.cookies.set(name, "")
        response.cookies.set(name, "", { ...options, maxAge: 0 })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user && pathname === "/login") {
    const destination = sanitizeRedirectTo(request.nextUrl.searchParams.get("redirectTo"))
    const redirectResponse = NextResponse.redirect(new URL(destination, request.url))
    copyCookies(response, redirectResponse)
    return redirectResponse
  }

  if (isPublicPath(pathname)) {
    return response
  }

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirectTo", sanitizeRedirectTo(`${pathname}${search}`, "/dashboard"))
    const redirectResponse = NextResponse.redirect(url)
    copyCookies(response, redirectResponse)
    return redirectResponse
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
