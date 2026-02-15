"use client"

import { useState } from "react"

import { gradeHomework } from "@/lib/api/client"
import { createClient } from "@/lib/supabase/client"
import { HomeworkGradeResponse, WeakPointDTO } from "@/lib/types/learning-path"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type HomeworkUploadPanelProps = {
  subject: string
  onWeakPoints?: (weakPoints: WeakPointDTO[]) => void
}

export function HomeworkUploadPanel({ subject, onWeakPoints }: HomeworkUploadPanelProps) {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<HomeworkGradeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const onUpload = async () => {
    if (!file) {
      setError("请先选择图片")
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

      const formData = new FormData()
      formData.set("subject", subject)
      formData.set("file", file)

      const response = await gradeHomework(token, formData)
      setResult(response)
      onWeakPoints?.(response.weakPoints)
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传批改失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>手写作业识别与批改</CardTitle>
        <CardDescription>上传 jpg/png/webp 图片，系统会提取内容并自动批改客观题与填空题。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <Button onClick={onUpload} disabled={loading || !file}>
          {loading ? "识别中..." : "上传并批改"}
        </Button>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {result ? (
          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">OCR 文本摘要：{result.ocrText.slice(0, 160)}...</p>
            <ul className="space-y-2">
              {result.gradedItems.map((item, index) => (
                <li key={`${item.question}-${index}`} className="rounded-md bg-muted/40 p-2 text-sm">
                  <p className="font-medium">{item.question}</p>
                  <p>你的答案：{item.studentAnswer}</p>
                  <p>正确答案：{item.correctAnswer}</p>
                  <p>判定：{item.isCorrect ? "正确" : "错误"}</p>
                  <p>反馈：{item.feedback}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
