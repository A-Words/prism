import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ColdStartPanel } from "@/components/assessment/cold-start-panel"
import {
  coldStartSubmitFixture,
  createSessionFixture,
  knowledgePointsFixture,
} from "@/tests/fixtures/learning-path"

const getSessionMock = vi.fn()

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: getSessionMock,
    },
  }),
}))

vi.mock("@/lib/api/client", () => ({
  createColdStartSession: vi.fn(),
  getKnowledgePoints: vi.fn(),
  submitColdStartSession: vi.fn(),
}))

describe("ColdStartPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows error when session token is missing", async () => {
    const { getKnowledgePoints } = await import("@/lib/api/client")
    getSessionMock.mockResolvedValueOnce({ data: { session: null } })

    render(<ColdStartPanel />)

    expect(await screen.findByText("未获取到登录凭证，请重新登录")).toBeInTheDocument()
    expect(getKnowledgePoints).not.toHaveBeenCalled()
  })

  it("loads knowledge points and keeps submit disabled until all answers are filled", async () => {
    const user = userEvent.setup()
    const { getKnowledgePoints, createColdStartSession } = await import("@/lib/api/client")

    getSessionMock.mockResolvedValue({ data: { session: { access_token: "token-1" } } })
    vi.mocked(getKnowledgePoints).mockResolvedValue(knowledgePointsFixture)
    vi.mocked(createColdStartSession).mockResolvedValue(createSessionFixture)

    render(<ColdStartPanel />)

    const startButton = await screen.findByRole("button", { name: "开始冷启动测评" })
    await waitFor(() => expect(startButton).toBeEnabled())
    await user.click(startButton)

    await waitFor(() => {
      expect(createColdStartSession).toHaveBeenCalledWith("token-1", {
        subject: "math",
        goalKnowledgeIds: [102, 103],
        targetDate: expect.any(String),
      })
    })

    const submitButton = await screen.findByRole("button", { name: "提交测评并生成路径" })
    expect(submitButton).toBeDisabled()

    await user.click(screen.getByRole("button", { name: "4" }))
    await waitFor(() => expect(submitButton).toBeEnabled())
  })

  it("submits answers and calls callbacks with learning path data", async () => {
    const user = userEvent.setup()
    const onPathReady = vi.fn()
    const onWeakPoints = vi.fn()
    const { getKnowledgePoints, createColdStartSession, submitColdStartSession } = await import("@/lib/api/client")

    getSessionMock.mockResolvedValue({ data: { session: { access_token: "token-1" } } })
    vi.mocked(getKnowledgePoints).mockResolvedValue(knowledgePointsFixture)
    vi.mocked(createColdStartSession).mockResolvedValue(createSessionFixture)
    vi.mocked(submitColdStartSession).mockResolvedValue(coldStartSubmitFixture)

    render(<ColdStartPanel onPathReady={onPathReady} onWeakPoints={onWeakPoints} />)

    await waitFor(() => expect(screen.getByRole("button", { name: "开始冷启动测评" })).toBeEnabled())
    await user.click(screen.getByRole("button", { name: "开始冷启动测评" }))
    await screen.findByRole("button", { name: "提交测评并生成路径" })

    await user.click(screen.getByRole("button", { name: "4" }))
    await user.click(screen.getByRole("button", { name: "提交测评并生成路径" }))

    await waitFor(() => {
      expect(submitColdStartSession).toHaveBeenCalledWith("token-1", createSessionFixture.sessionId, [
        { questionId: 1, answer: "4", durationSec: 60 },
      ])
      expect(onPathReady).toHaveBeenCalledWith(coldStartSubmitFixture.learningPath)
      expect(onWeakPoints).toHaveBeenCalledWith(coldStartSubmitFixture.weakPoints)
    })
  })
})
