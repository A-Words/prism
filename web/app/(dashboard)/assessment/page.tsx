"use client"

import { useState } from "react"

import { ColdStartPanel } from "@/components/assessment/cold-start-panel"
import { HomeworkUploadPanel } from "@/components/assessment/homework-upload-panel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LearningPathDTO, WeakPointDTO } from "@/lib/types/learning-path"

export default function AssessmentPage() {
  const [subject, setSubject] = useState("math")
  const [weakPoints, setWeakPoints] = useState<WeakPointDTO[]>([])
  const [path, setPath] = useState<LearningPathDTO | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">模块：智能个性化学习路径规划</Badge>
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        >
          <option value="math">数学</option>
          <option value="physics">物理</option>
        </select>
      </div>

      <ColdStartPanel onPathReady={setPath} onWeakPoints={setWeakPoints} />

      <HomeworkUploadPanel subject={subject} onWeakPoints={setWeakPoints} />

      <Card>
        <CardHeader>
          <CardTitle>薄弱点定位</CardTitle>
          <CardDescription>根据错题与掌握度自动识别需优先补强的知识点。</CardDescription>
        </CardHeader>
        <CardContent>
          {weakPoints.length > 0 ? (
            <ul className="space-y-2">
              {weakPoints.map((item) => (
                <li key={item.knowledgeId} className="rounded-md border p-2 text-sm">
                  <p className="font-medium">{item.title}</p>
                  <p>薄弱度：{Math.round(item.weakScore * 100)}%</p>
                  <p className="text-muted-foreground">{item.reason}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">完成测评或作业上传后显示薄弱点。</p>
          )}
        </CardContent>
      </Card>

      {path ? (
        <Card>
          <CardHeader>
            <CardTitle>路径生成结果</CardTitle>
            <CardDescription>已根据测评生成学习路径，可前往“学习路径”页面查看 DAG。</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">路径 ID：{path.pathId}</p>
            <p className="text-sm">当前节点索引：{path.currentIndex}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
