"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
  const router = useRouter()
  const [redirectTo, setRedirectTo] = useState("/dashboard")

  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setRedirectTo(params.get("redirectTo") ?? "/dashboard")

    const hash = window.location.hash
    if (!hash.includes("access_token") || !hash.includes("refresh_token")) {
      return
    }

    const hashParams = new URLSearchParams(hash.replace("#", ""))
    const accessToken = hashParams.get("access_token")
    const refreshToken = hashParams.get("refresh_token")
    if (!accessToken || !refreshToken) {
      return
    }

    const run = async () => {
      try {
        const supabase = createClient()
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (setSessionError) {
          throw setSessionError
        }
        router.replace(redirectTo)
      } catch (err) {
        setError(err instanceof Error ? err.message : "登录失败")
      }
    }

    run().catch(() => {
      setError("登录失败")
    })
  }, [redirectTo, router])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    try {
      const supabase = createClient()
      const emailRedirectTo = `${window.location.origin}/callback`
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo,
        },
      })
      if (signInError) {
        throw signInError
      }
      setMessage("登录链接已发送，请检查邮箱。")
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送登录链接失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 via-white to-lime-50 px-4 py-16">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Prism 登录</CardTitle>
            <CardDescription>使用邮箱魔法链接登录，成功后进入学习路径模块。</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "发送中..." : "发送登录链接"}
              </Button>
            </form>
            {message ? <p className="mt-3 text-sm text-emerald-600">{message}</p> : null}
            {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
