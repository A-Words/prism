import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { HomeworkUploadPanel } from "@/components/assessment/homework-upload-panel"
import { homeworkGradeFixture } from "@/tests/fixtures/learning-path"

const getSessionMock = vi.fn()

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: getSessionMock,
    },
  }),
}))

vi.mock("@/lib/api/client", () => ({
  gradeHomework: vi.fn(),
}))

describe("HomeworkUploadPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("blocks upload when no file is selected", () => {
    render(<HomeworkUploadPanel subject="math" />)
    expect(screen.getByRole("button", { name: "上传并批改" })).toBeDisabled()
  })

  it("uploads homework and renders grading result", async () => {
    const user = userEvent.setup()
    const onWeakPoints = vi.fn()
    const { gradeHomework } = await import("@/lib/api/client")
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "token-2" } } })
    vi.mocked(gradeHomework).mockResolvedValue(homeworkGradeFixture)

    render(<HomeworkUploadPanel subject="math" onWeakPoints={onWeakPoints} />)

    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement
    const file = new File(["binary"], "homework.png", { type: "image/png" })
    await user.upload(fileInput, file)

    await user.click(screen.getByRole("button", { name: "上传并批改" }))

    await waitFor(() => expect(gradeHomework).toHaveBeenCalledTimes(1))
    expect(await screen.findByText("OCR 文本摘要：题目一：x+3=7 ......")).toBeInTheDocument()
    expect(screen.getByText("你的答案：4")).toBeInTheDocument()
    expect(onWeakPoints).toHaveBeenCalledWith(homeworkGradeFixture.weakPoints)
  })
})
