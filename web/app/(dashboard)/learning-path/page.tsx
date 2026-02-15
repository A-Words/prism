"use client"

import { useEffect, useMemo, useState } from "react"

import { PathDagChart } from "@/components/learning-path/path-dag-chart"
import { NodeDetailSheet } from "@/components/learning-path/node-detail-sheet"
import { PredictionPanel } from "@/components/learning-path/prediction-panel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  getCurrentLearningPath,
  getPrediction,
  submitPracticeAttempt,
} from "@/lib/api/client"
import { createClient } from "@/lib/supabase/client"
import { LearningPathDTO, PathNodeDTO, PredictionDTO } from "@/lib/types/learning-path"

export default function LearningPathPage() {
  const [subject, setSubject] = useState("math")
  const [path, setPath] = useState<LearningPathDTO | null>(null)
  const [prediction, setPrediction] = useState<PredictionDTO | null>(null)
  const [selectedNode, setSelectedNode] = useState<PathNodeDTO | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [questionId, setQuestionId] = useState("1001")
  const [knowledgeId, setKnowledgeId] = useState("101")
  const [answer, setAnswer] = useState("")
  const [durationSec, setDurationSec] = useState("60")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const pathId = useMemo(() => path?.pathId ?? 0, [path])

  const withToken = async <T,>(runner: (token: string) => Promise<T>) => {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) {
      throw new Error("未获取到登录凭证，请重新登录")
    }
    return runner(token)
  }

  const loadPath = async () => {
    setLoading(true)
    setError("")
    try {
      const nextPath = await withToken((token) => getCurrentLearningPath(token, subject))
      setPath(nextPath)
      const nextPrediction = await withToken((token) => getPrediction(token, nextPath.pathId))
      setPrediction(nextPrediction)
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载学习路径失败")
      setPath(null)
      setPrediction(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPath().catch(() => {
      setError("加载学习路径失败")
    })
  }, [subject])

  const submitAttempt = async () => {
    if (!pathId) {
      setError("请先加载学习路径")
      return
    }

    setLoading(true)
    setError("")
    try {
      const updatedPath = await withToken((token) =>
        submitPracticeAttempt(token, pathId, {
          questionId: Number(questionId),
          knowledgeId: Number(knowledgeId),
          answer,
          durationSec: Number(durationSec),
          source: "path",
        })
      )
      setPath(updatedPath)
      const nextPrediction = await withToken((token) => getPrediction(token, pathId))
      setPrediction(nextPrediction)
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交练习失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>动态学习路线图（DAG）</CardTitle>
          <CardDescription>节点颜色：绿色已掌握，蓝色待学习，橙色需复习。点击节点可查看详情。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            >
              <option value="math">数学</option>
              <option value="physics">物理</option>
            </select>
            <Button variant="secondary" onClick={() => loadPath()} disabled={loading}>
              {loading ? "刷新中..." : "刷新路径"}
            </Button>
          </div>

          {path ? (
            <PathDagChart
              path={path}
              onNodeClick={(node) => {
                setSelectedNode(node)
                setDetailOpen(true)
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">暂无路径，请先完成测评。</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>实时路径优化</CardTitle>
          <CardDescription>每次作答后触发重排。连对可跳过冗余，连错会插入前置补习。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <Input value={questionId} onChange={(event) => setQuestionId(event.target.value)} placeholder="questionId" />
            <Input value={knowledgeId} onChange={(event) => setKnowledgeId(event.target.value)} placeholder="knowledgeId" />
            <Input value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="answer" />
            <Input value={durationSec} onChange={(event) => setDurationSec(event.target.value)} placeholder="durationSec" />
          </div>
          <Button onClick={submitAttempt} disabled={loading || !path}>
            {loading ? "提交中..." : "提交作答并更新路径"}
          </Button>

          {path?.adjustmentEvents?.length ? (
            <ul className="space-y-2 text-sm">
              {path.adjustmentEvents.slice(-5).reverse().map((event, index) => (
                <li key={`${event.createdAt}-${index}`} className="rounded-md border p-2">
                  <p className="font-medium">{event.eventType}</p>
                  <p className="text-muted-foreground">{JSON.stringify(event.payload)}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <PredictionPanel prediction={prediction} />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <NodeDetailSheet node={selectedNode} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  )
}
