import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import LearningPathPage from "@/app/(dashboard)/learning-path/page"
import { learningPathFixture, predictionFixture } from "@/tests/fixtures/learning-path"

const getSessionMock = vi.fn()

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: getSessionMock,
    },
  }),
}))

vi.mock("@/lib/api/client", () => ({
  getCurrentLearningPath: vi.fn(),
  getPrediction: vi.fn(),
  submitPracticeAttempt: vi.fn(),
}))

vi.mock("@/components/learning-path/path-dag-chart", () => ({
  PathDagChart: ({ onNodeClick }: { onNodeClick?: (node: (typeof learningPathFixture)["nodes"][number]) => void }) => (
    <button
      type="button"
      onClick={() => onNodeClick?.(learningPathFixture.nodes[0])}
    >
      mock-dag
    </button>
  ),
}))

vi.mock("@/components/learning-path/node-detail-sheet", () => ({
  NodeDetailSheet: ({ node }: { node: { title: string } | null }) => (
    <div>{node ? `selected:${node.title}` : "no-selection"}</div>
  ),
}))

describe("LearningPathPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("loads path and prediction on mount", async () => {
    const { getCurrentLearningPath, getPrediction } = await import("@/lib/api/client")
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "token-3" } } })
    vi.mocked(getCurrentLearningPath).mockResolvedValue(learningPathFixture)
    vi.mocked(getPrediction).mockResolvedValue(predictionFixture)

    render(<LearningPathPage />)

    await waitFor(() => {
      expect(getCurrentLearningPath).toHaveBeenCalledWith("token-3", "math")
      expect(getPrediction).toHaveBeenCalledWith("token-3", learningPathFixture.pathId)
    })

    expect(await screen.findByText("整体提升概率：81%")).toBeInTheDocument()
  })

  it("submits attempt and refreshes prediction", async () => {
    const user = userEvent.setup()
    const { getCurrentLearningPath, getPrediction, submitPracticeAttempt } = await import("@/lib/api/client")
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "token-4" } } })
    vi.mocked(getCurrentLearningPath).mockResolvedValue(learningPathFixture)
    vi.mocked(getPrediction).mockResolvedValue(predictionFixture)
    vi.mocked(submitPracticeAttempt).mockResolvedValue(learningPathFixture)

    render(<LearningPathPage />)
    await screen.findByText("整体提升概率：81%")

    await user.click(screen.getByRole("button", { name: "提交作答并更新路径" }))

    await waitFor(() => {
      expect(submitPracticeAttempt).toHaveBeenCalledWith("token-4", learningPathFixture.pathId, {
        questionId: 1001,
        knowledgeId: 101,
        answer: "",
        durationSec: 60,
        source: "path",
      })
    })

    expect(getPrediction).toHaveBeenCalledTimes(2)
  })

  it("shows token error when session is missing", async () => {
    const { getCurrentLearningPath } = await import("@/lib/api/client")
    getSessionMock.mockResolvedValue({ data: { session: null } })
    vi.mocked(getCurrentLearningPath).mockResolvedValue(learningPathFixture)

    render(<LearningPathPage />)

    expect(await screen.findByText("未获取到登录凭证，请重新登录")).toBeInTheDocument()
  })
})
