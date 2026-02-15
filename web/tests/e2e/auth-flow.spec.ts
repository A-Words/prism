import { expect, test } from "@playwright/test"

import { startMockSupabase } from "./helpers/mock-supabase"

const SUPABASE_MOCK_PORT = 54321

let stopMockSupabase: (() => Promise<void>) | undefined

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
  stopMockSupabase = await startMockSupabase(SUPABASE_MOCK_PORT)
})

test.afterAll(async () => {
  if (stopMockSupabase) {
    await stopMockSupabase()
  }
})

test("unauthorized user visiting /dashboard is redirected to /login", async ({ page }) => {
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/login\?redirectTo=/)
})

test("login form submits OTP request and shows success message", async ({ page }) => {
  let otpIntercepted = false
  await page.route("**/auth/v1/otp**", async (route) => {
    otpIntercepted = true
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message_id: "mock-message-id" }),
    })
  })

  await page.goto("/login")
  await page.getByPlaceholder("you@example.com").fill("student@example.com")
  await page.getByRole("button", { name: "发送登录链接" }).click()

  await expect.poll(() => otpIntercepted).toBe(true)
  await expect(page.getByText("登录链接已发送，请检查邮箱。")).toBeVisible()
})

test("callback redirectTo blocks external redirects", async ({ page }) => {
  await page.goto("/callback?redirectTo=//evil.com")

  await expect(page).toHaveURL(/\/login\?redirectTo=%2Fdashboard$/)
  expect(page.url()).not.toContain("evil.com")
})
