import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: { [key: string]: unknown }) {
        try {
          cookieStore.set(name, value, options)
        } catch {
          // 在某些服务端上下文无法写 cookie，这里吞掉异常由上层处理。
        }
      },
      remove(name: string, options: { [key: string]: unknown }) {
        try {
          cookieStore.set(name, "", { ...options, maxAge: 0 })
        } catch {
          // 同上
        }
      },
    },
  })
}
