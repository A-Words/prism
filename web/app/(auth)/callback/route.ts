import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const redirectTo = url.searchParams.get("redirectTo") ?? "/dashboard"

  if (code) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        const loginUrl = new URL("/login", url.origin)
        loginUrl.searchParams.set("error", error.message)
        return NextResponse.redirect(loginUrl)
      }
    } catch (error) {
      const loginUrl = new URL("/login", url.origin)
      loginUrl.searchParams.set("error", error instanceof Error ? error.message : "callback error")
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.redirect(new URL(redirectTo, url.origin))
}
