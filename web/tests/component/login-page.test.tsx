import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import LoginPage from "@/app/(auth)/login/page"

const replaceMock = vi.fn()
const setSessionMock = vi.fn()
const signInWithOtpMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}))

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      setSession: setSessionMock,
      signInWithOtp: signInWithOtpMock,
    },
  }),
}))

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setSessionMock.mockResolvedValue({ error: null })
    signInWithOtpMock.mockResolvedValue({ error: null })
    window.history.replaceState({}, "", "/login")
  })

  it("shows callback error from query string", async () => {
    window.history.replaceState({}, "", "/login?error=callback_failed")
    render(<LoginPage />)

    expect(await screen.findByText("callback_failed")).toBeInTheDocument()
  })

  it("reads tokens from hash and redirects after setSession", async () => {
    window.history.replaceState(
      {},
      "",
      "/login?redirectTo=/learning-path#access_token=at-1&refresh_token=rt-1"
    )
    render(<LoginPage />)

    await waitFor(() => {
      expect(setSessionMock).toHaveBeenCalledWith({
        access_token: "at-1",
        refresh_token: "rt-1",
      })
      expect(replaceMock).toHaveBeenCalledWith("/learning-path")
    })
  })

  it("submits otp login and shows success message", async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, "", "/login?redirectTo=/assessment")
    render(<LoginPage />)

    await user.type(screen.getByPlaceholderText("you@example.com"), "student@example.com")
    await user.click(screen.getByRole("button", { name: "发送登录链接" }))

    await waitFor(() => {
      expect(signInWithOtpMock).toHaveBeenCalledWith({
        email: "student@example.com",
        options: {
          emailRedirectTo: `${window.location.origin}/callback?redirectTo=%2Fassessment`,
        },
      })
    })
    expect(await screen.findByText("登录链接已发送，请检查邮箱。")).toBeInTheDocument()
  })

  it("shows error when setSession fails", async () => {
    setSessionMock.mockResolvedValueOnce({ error: { message: "session_failed" } })
    window.history.replaceState({}, "", "/login#access_token=at-2&refresh_token=rt-2")
    render(<LoginPage />)

    expect(await screen.findByText("登录失败")).toBeInTheDocument()
  })
})
