import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const fetchMock = vi.fn()

describe("lib/api/client", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal("fetch", fetchMock)
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("attaches bearer token and content type for JSON requests", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sessionId: 1, subject: "math", targetDate: "2026-02-22", questions: [] }),
    })

    const api = await import("@/lib/api/client")
    await api.createColdStartSession("token-123", {
      subject: "math",
      goalKnowledgeIds: [1, 2],
      targetDate: "2026-02-22",
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain("/assessment/cold-start/sessions")
    expect(init.method).toBe("POST")
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token-123")
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json")
  })

  it("throws ApiError with status and payload when response is not ok", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "unauthorized" }),
    })

    const api = await import("@/lib/api/client")
    await expect(api.getPrediction("bad-token", 99)).rejects.toMatchObject({
      name: "Error",
      message: "unauthorized",
      status: 401,
      details: { error: "unauthorized" },
    })
  })

  it("encodes query params correctly", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ pathId: 1, nodes: [], edges: [], currentIndex: 0, subject: "math", targetDate: "", overallImproveProb: 0 }),
    })

    const api = await import("@/lib/api/client")
    await api.getCurrentLearningPath("token-abc", "math & algebra")

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain("subject=math%20%26%20algebra")
  })

  it("sends FormData for homework upload", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ uploadId: 1, imageUrl: "", ocrText: "", gradedItems: [], weakPoints: [] }),
    })

    const api = await import("@/lib/api/client")
    const formData = new FormData()
    formData.set("subject", "math")
    await api.gradeHomework("token-z", formData)

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe("POST")
    expect(init.body).toBe(formData)
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token-z")
  })

  it("covers additional endpoint helpers", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ weakPoints: [], learningPath: { pathId: 1 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pathId: 1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ id: 1, subject: "math", title: "点", content: "" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ knowledgeId: 1, title: "点", weakScore: 0.6, reason: "错题多" }] }),
      })

    const api = await import("@/lib/api/client")

    await api.submitColdStartSession("token-a", 88, [{ questionId: 1, answer: "A", durationSec: 30 }])
    await api.submitPracticeAttempt("token-a", 66, {
      questionId: 1,
      knowledgeId: 2,
      answer: "B",
      durationSec: 45,
      source: "path",
    })
    await api.getKnowledgePoints("token-a", "math")
    await api.getWeaknesses("token-a", "math")

    expect(fetchMock).toHaveBeenCalledTimes(4)
  })
})
