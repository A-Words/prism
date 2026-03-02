"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { switchScene, getCurrentScene, evaluateIntervention } from "@/lib/api/client"
import { SceneType, SceneStrategy, InterventionEvalResponse, EmotionType } from "@/lib/types/modules"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Activity, Brain, Zap } from "lucide-react"

export default function EmotionPage() {
  const [scene, setScene] = useState<SceneType>("classroom")
  const [strategy, setStrategy] = useState<SceneStrategy | null>(null)
  
  const [emotion, setEmotion] = useState<EmotionType>("focused")
  const [focusScore, setFocusScore] = useState("0.8")
  const [fatigueLevel, setFatigueLevel] = useState("0.2")
  const [postureStatus, setPostureStatus] = useState("good")
  
  const [intervention, setIntervention] = useState<InterventionEvalResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const withToken = useCallback(async function runWithToken<T>(runner: (token: string) => Promise<T>) {
    const { data } = await createClient().auth.getSession()
    if (!data.session?.access_token) throw new Error("未获取到登录凭证")
    return runner(data.session.access_token)
  }, [])

  const loadScene = useCallback(async () => {
    try {
      const data = await withToken((t) => getCurrentScene(t))
      setScene(data.currentScene); setStrategy(data.strategy)
    } catch (e) { console.error(e) }
  }, [withToken])

  useEffect(() => { loadScene() }, [loadScene])

  const handleSwitchScene = async (newScene: SceneType) => {
    setLoading(true); setError("")
    try {
      const data = await withToken((t) => switchScene(t, newScene))
      setScene(data.currentScene); setStrategy(data.strategy); setIntervention(null)
    } catch (e) { setError(e instanceof Error ? e.message : "切换场景失败") }
    finally { setLoading(false) }
  }

  const handleEvaluate = async () => {
    setLoading(true); setError("")
    try {
      const res = await withToken((t) => evaluateIntervention(t, {
        emotion, scene, postureStatus,
        focusScore: parseFloat(focusScore), fatigueLevel: parseFloat(fatigueLevel),
      }))
      setIntervention(res)
    } catch (e) { setError(e instanceof Error ? e.message : "评估失败") }
    finally { setLoading(false) }
  }

  const scenes: { v: SceneType; l: string }[] = [
    { v: "classroom", l: "课堂模式" }, { v: "self-study", l: "自习模式" }, { v: "exam-prep", l: "考前复习" }
  ]
  const emotions: { v: EmotionType; l: string }[] = [
    { v: "focused", l: "专注" }, { v: "confused", l: "困惑" }, { v: "anxious", l: "焦虑" },
    { v: "frustrated", l: "挫败" }, { v: "tired", l: "疲劳" }
  ]
  const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />场景感知与策略</CardTitle>
          <CardDescription>当前学习场景决定了AI的介入程度和语气</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            {scenes.map((o) => (
              <Button key={o.v} variant={scene === o.v ? "default" : "outline"} onClick={() => handleSwitchScene(o.v)} disabled={loading}>{o.l}</Button>
            ))}
          </div>
          {strategy && (
            <div className="bg-muted/50 p-3 rounded-md text-sm space-y-2">
              <div className="flex gap-4"><span className="font-medium">路径: {strategy.pathMode}</span><span className="font-medium">干预: {strategy.interventionLevel}</span><span className="font-medium">辅导: {strategy.tutorMode}</span></div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-primary" />实时状态模拟</CardTitle>
          <CardDescription>模拟来自摄像头的实时监测数据</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">情绪状态</label>
              <select className={inputClass} value={emotion} onChange={(e) => setEmotion(e.target.value as EmotionType)}>
                {emotions.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">姿态检测</label>
              <select className={inputClass} value={postureStatus} onChange={(e) => setPostureStatus(e.target.value)}>
                <option value="good">良好</option><option value="slouching">弯腰</option><option value="too_close">距离过近</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">专注度: {focusScore}</label>
              <input type="range" min="0" max="1" step="0.1" className="w-full" value={focusScore} onChange={(e) => setFocusScore(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">疲劳度: {fatigueLevel}</label>
              <input type="range" min="0" max="1" step="0.1" className="w-full" value={fatigueLevel} onChange={(e) => setFatigueLevel(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" />智能干预评估</CardTitle>
        </CardHeader>
        <CardContent>
          <Button className="w-full md:w-auto" onClick={handleEvaluate} disabled={loading}>{loading ? "分析中..." : "评估干预策略"}</Button>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
          {intervention && (
            <div className="mt-4 border rounded-md p-4 bg-primary/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg">{intervention.action}</span>
                <Badge variant={intervention.priority > 5 ? "destructive" : "default"}>优先级: {intervention.priority}</Badge>
              </div>
              <p className="text-muted-foreground">{intervention.message}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
