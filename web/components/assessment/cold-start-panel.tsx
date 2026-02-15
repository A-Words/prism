"use client"

import { useEffect, useMemo, useState } from "react"

import {
  createColdStartSession,
  getKnowledgePoints,
  submitColdStartSession,
} from "@/lib/api/client"
import { createClient } from "@/lib/supabase/client"
import {
  AssessmentQuestion,
  ColdStartSubmitResponse,
  KnowledgePointDTO,
  LearningPathDTO,
  WeakPointDTO,
} from "@/lib/types/learning-path"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

type ColdStartPanelProps = {
  onPathReady?: (path: LearningPathDTO) => void
  onWeakPoints?: (weakPoints: WeakPointDTO[]) => void
}

export function ColdStartPanel({ onPathReady, onWeakPoints }: ColdStartPanelProps) {
  const [subject, setSubject] = useState("math")
  const [targetDate, setTargetDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePointDTO[]>([])
  const [goalIds, setGoalIds] = useState<number[]>([])
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const canSubmitAnswers = useMemo(
    () => questions.length > 0 && questions.every((question) => (answers[question.id] ?? "").trim().length > 0),
    [answers, questions]
  )

  useEffect(() => {
    const loadKnowledge = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        if (!token) {
          setError("未获取到登录凭证，请重新登录")
          return
        }
        const points = await getKnowledgePoints(token, subject)
        setKnowledgePoints(points)
        setGoalIds(points.slice(-2).map((point) => point.id))
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载知识点失败")
      }
    }

    loadKnowledge().catch(() => {
      setError("加载知识点失败")
    })
  }, [subject])

  const createSession = async () => {
    setLoading(true)
    setError("")
    try {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) {
        throw new Error("未获取到登录凭证，请重新登录")
      }

      const response = await createColdStartSession(token, {
        subject,
        goalKnowledgeIds: goalIds,
        targetDate,
      })

      setSessionId(response.sessionId)
      setQuestions(response.questions)
      setAnswers({})
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建测评失败")
    } finally {
      setLoading(false)
    }
  }

  const submitAnswers = async () => {
    if (!sessionId) {
      return
    }
    setLoading(true)
    setError("")
    try {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) {
        throw new Error("未获取到登录凭证，请重新登录")
      }

      const payload = questions.map((question) => ({
        questionId: question.id,
        answer: answers[question.id],
        durationSec: 60,
      }))

      const response: ColdStartSubmitResponse = await submitColdStartSession(token, sessionId, payload)
      onPathReady?.(response.learningPath)
      onWeakPoints?.(response.weakPoints)
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交测评失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>初始能力评估（10题）</CardTitle>
        <CardDescription>冷启动生成能力画像，自动定位薄弱知识点。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">学科</span>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            >
              <option value="math">数学</option>
              <option value="physics">物理</option>
            </select>
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-muted-foreground">目标日期</span>
            <Input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
          </label>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">目标知识点（可多选）</p>
          <div className="flex flex-wrap gap-2">
            {knowledgePoints.map((point) => {
              const active = goalIds.includes(point.id)
              return (
                <button
                  key={point.id}
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs ${active ? "bg-primary text-primary-foreground" : "bg-background"}`}
                  onClick={() =>
                    setGoalIds((prev) =>
                      prev.includes(point.id) ? prev.filter((id) => id !== point.id) : [...prev, point.id]
                    )
                  }
                >
                  {point.title}
                </button>
              )
            })}
          </div>
        </div>

        <Button onClick={createSession} disabled={loading || goalIds.length === 0}>
          {loading ? "生成中..." : "开始冷启动测评"}
        </Button>

        {questions.length > 0 ? (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div key={question.id} className="rounded-lg border p-3">
                <p className="mb-2 text-sm font-medium">
                  {index + 1}. {question.question}
                </p>
                <div className="flex flex-wrap gap-2">
                  {question.options.length > 0 ? (
                    question.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`rounded-md border px-2 py-1 text-xs ${answers[question.id] === option ? "bg-secondary" : "bg-background"}`}
                        onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option }))}
                      >
                        {option}
                      </button>
                    ))
                  ) : (
                    <Input
                      value={answers[question.id] ?? ""}
                      onChange={(event) => setAnswers((prev) => ({ ...prev, [question.id]: event.target.value }))}
                    />
                  )}
                </div>
                <div className="mt-2">
                  <Badge variant="outline">难度 {question.difficulty.toFixed(2)}</Badge>
                </div>
              </div>
            ))}
            <Button onClick={submitAnswers} disabled={loading || !canSubmitAnswers}>
              {loading ? "提交中..." : "提交测评并生成路径"}
            </Button>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  )
}
