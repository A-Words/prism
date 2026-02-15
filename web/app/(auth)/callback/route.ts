import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"

import { sanitizeRedirectTo } from "@/lib/auth/redirect"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const redirectTo = sanitizeRedirectTo(url.searchParams.get("redirectTo"))
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    const loginUrl = new URL("/login", url.origin)
    loginUrl.searchParams.set("error", "Missing Supabase env for callback")
    return NextResponse.redirect(loginUrl)
  }

  // 关键点：在 Route Handler 中把 Supabase 写入的 session cookie 绑定到 response。
  const response = NextResponse.redirect(new URL(redirectTo, url.origin))
  const requestCookies = new Headers(request.headers).get("cookie") ?? ""

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        const pairs = requestCookies.split(";").map((item) => item.trim())
        const matched = pairs.find((pair) => pair.startsWith(`${name}=`))
        if (!matched) {
          return undefined
        }
        return decodeURIComponent(matched.slice(name.length + 1))
      },
      set(name: string, value: string, options: { [key: string]: unknown }) {
        response.cookies.set(name, value, options)
      },
      remove(name: string, options: { [key: string]: unknown }) {
        response.cookies.set(name, "", { ...options, maxAge: 0 })
      },
    },
  })

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      const loginUrl = new URL("/login", url.origin)
      loginUrl.searchParams.set("error", error.message)
      loginUrl.searchParams.set("redirectTo", redirectTo)
      return NextResponse.redirect(loginUrl)
    }
  }

  return response
}
