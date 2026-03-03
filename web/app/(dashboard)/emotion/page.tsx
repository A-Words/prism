"use client"

import { useCallback, useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { switchScene, getCurrentScene, evaluateIntervention } from "@/lib/api/client"
import { SceneType, SceneStrategy, InterventionEvalResponse, EmotionType, HealthAlertDTO } from "@/lib/types/modules"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, Brain, Zap, Play, Square, AlertTriangle, X } from "lucide-react"
import { useMonitorWs } from "@/hooks/use-monitor-ws"

export default function EmotionPage() {
  const [scene, setScene] = useState<SceneType>("classroom")
  const [strategy, setStrategy] = useState<SceneStrategy | null>(null)
  
  // Simulation controls (inputs)
  const [simEmotion, setSimEmotion] = useState<EmotionType>("focused")
  const [simFocusScore, setSimFocusScore] = useState("0.8")
  const [simFatigueLevel, setSimFatigueLevel] = useState("0.2")
  const [simPostureStatus, setSimPostureStatus] = useState("good")

  // Real-time data (from WS)
  const [realTimeEmotion, setRealTimeEmotion] = useState<EmotionType | null>(null)
  const [realTimeFocus, setRealTimeFocus] = useState<number | null>(null)
  const [realTimeFatigue, setRealTimeFatigue] = useState<number | null>(null)
  const [realTimePosture, setRealTimePosture] = useState<string | null>(null)
  const [healthAlerts, setHealthAlerts] = useState<Array<HealthAlertDTO & { id: number }>>([]) 
  const [intervention, setIntervention] = useState<InterventionEvalResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [token, setToken] = useState<string | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const alertIdCounter = useRef(0)

  // Fetch token once
  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token || null)
    })
  }, [])

  const handleHealthAlert = useCallback((alert: HealthAlertDTO) => {
    const id = ++alertIdCounter.current
    setHealthAlerts(prev => [...prev, { ...alert, id }])
    // 5秒后自动移除
    setTimeout(() => setHealthAlerts(prev => prev.filter(a => a.id !== id)), 5000)
  }, [])

  const { isConnected, connect, disconnect, sendVideoFrame, emotionResult, poseResult, interventionResult } = useMonitorWs({
    token: token || undefined,
    onHealthAlert: handleHealthAlert
  })

  // Update real-time state when WS data arrives
  useEffect(() => {
    if (emotionResult) {
      setRealTimeEmotion(emotionResult.emotion)
      if (emotionResult.focusScore !== undefined) setRealTimeFocus(emotionResult.focusScore)
      if (emotionResult.fatigueLevel !== undefined) setRealTimeFatigue(emotionResult.fatigueLevel)
    }
  }, [emotionResult])

  useEffect(() => {
    if (poseResult) {
      setRealTimePosture(poseResult.status)
    }
  }, [poseResult])

  useEffect(() => {
    if (interventionResult) {
      setIntervention(interventionResult)
    }
  }, [interventionResult])

  const loadScene = useCallback(async () => {
    if (!token) return
    try {
      const data = await getCurrentScene(token)
      setScene(data.currentScene); setStrategy(data.strategy)
    } catch (e) { console.error(e) }
  }, [token])

  useEffect(() => { 
    if (token) loadScene() 
  }, [token, loadScene])

  const handleSwitchScene = async (newScene: SceneType) => {
    if (!token) return
    setLoading(true); setError("")
    try {
      const data = await switchScene(token, newScene)
      setScene(data.currentScene); setStrategy(data.strategy); setIntervention(null)
    } catch (e) { setError(e instanceof Error ? e.message : "切换场景失败") }
    finally { setLoading(false) }
  }

  const handleEvaluate = async () => {
    if (!token) return
    setLoading(true); setError("")
    try {
      const res = await evaluateIntervention(token, {
        emotion: realTimeEmotion || simEmotion,
        scene,
        postureStatus: realTimePosture || simPostureStatus,
        focusScore: realTimeFocus ?? parseFloat(simFocusScore),
        fatigueLevel: realTimeFatigue ?? parseFloat(simFatigueLevel),
      })
      setIntervention(res)
    } catch (e) { setError(e instanceof Error ? e.message : "评估失败") }
    finally { setLoading(false) }
  }

  // Toggle monitoring
  const toggleMonitoring = () => {
    if (isMonitoring) {
      setIsMonitoring(false)
      disconnect()
      if (intervalRef.current) clearInterval(intervalRef.current)
    } else {
      setIsMonitoring(true)
      connect()
    }
  }

  // Simulation loop
  useEffect(() => {
    if (isMonitoring && isConnected) {
      intervalRef.current = setInterval(() => {
        // 发送模拟视频帧数据（1x1像素占位图），服务端 AI 会返回分析结果
        const dummyImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        sendVideoFrame(dummyImage, undefined, scene)
      }, 3000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isMonitoring, isConnected, scene, sendVideoFrame])


  const scenes: { v: SceneType; l: string }[] = [
    { v: "classroom", l: "课堂模式" }, { v: "self-study", l: "自习模式" }, { v: "exam-prep", l: "考前复习" }
  ]
  const emotions: { v: EmotionType; l: string }[] = [
    { v: "focused", l: "专注" }, { v: "confused", l: "困惑" }, { v: "anxious", l: "焦虑" },
    { v: "frustrated", l: "挫败" }, { v: "tired", l: "疲劳" }
  ]
  const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

  // 健康告警浮层
  const alertOverlay = healthAlerts.length > 0 && (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {healthAlerts.map((a) => (
        <div key={a.id} className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm shadow-lg animate-in slide-in-from-right">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-destructive">健康提醒: {a.alertType}</p>
            <p className="text-muted-foreground">{a.message}</p>
          </div>
          <button onClick={() => setHealthAlerts(prev => prev.filter(x => x.id !== a.id))} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )

  return (
    <>
      {alertOverlay}
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
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-primary" />实时状态监测</CardTitle>
            <CardDescription>连接摄像头实时分析学习状态</CardDescription>
          </div>
          <Button 
            variant={isMonitoring ? "destructive" : "default"} 
            onClick={toggleMonitoring}
            className="gap-2"
          >
            {isMonitoring ? <Square className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
            {isMonitoring ? "停止监测" : "开始监测"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Real-time Status Display */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg border">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">实时情绪</span>
              <div className="font-medium text-lg flex items-center gap-2">
                {realTimeEmotion || "--"}
                {isConnected && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">专注度</span>
              <div className="font-medium text-lg">{realTimeFocus !== null ? (realTimeFocus * 100).toFixed(0) + "%" : "--"}</div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">疲劳度</span>
              <div className="font-medium text-lg">{realTimeFatigue !== null ? (realTimeFatigue * 100).toFixed(0) + "%" : "--"}</div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">姿态</span>
              <div className="font-medium text-lg">{realTimePosture === "good" ? "良好" : realTimePosture === "slouching" ? "弯腰" : realTimePosture === "too_close" ? "过近" : "--"}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <label className="text-sm font-medium">模拟情绪 (发送端)</label>
              <select className={inputClass} value={simEmotion} onChange={(e) => setSimEmotion(e.target.value as EmotionType)}>
                {emotions.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">模拟姿态 (发送端)</label>
              <select className={inputClass} value={simPostureStatus} onChange={(e) => setSimPostureStatus(e.target.value)}>
                <option value="good">良好</option><option value="slouching">弯腰</option><option value="too_close">距离过近</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">模拟专注度: {simFocusScore}</label>
              <input type="range" min="0" max="1" step="0.1" className="w-full" value={simFocusScore} onChange={(e) => setSimFocusScore(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">模拟疲劳度: {simFatigueLevel}</label>
              <input type="range" min="0" max="1" step="0.1" className="w-full" value={simFatigueLevel} onChange={(e) => setSimFatigueLevel(e.target.value)} />
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
                <Badge variant={intervention.urgency === "high" ? "destructive" : "default"}>紧急度: {intervention.urgency}</Badge>
              </div>
              <p className="text-muted-foreground">{intervention.message}</p>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </>
  )
}
