"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  getHealthAlerts,
  acknowledgeHealthAlert,
  getHealthSummary,
} from "@/lib/api/client"
import { HealthAlertDTO, HealthSummaryResponse } from "@/lib/types/modules"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HeartPulse, Eye, AlertTriangle, Check } from "lucide-react"

export default function HealthPage() {
  const [summary, setSummary] = useState<HealthSummaryResponse | null>(null)
  const [alerts, setAlerts] = useState<HealthAlertDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showAll, setShowAll] = useState(false)

  const withToken = useCallback(
    async function runWithToken<T>(runner: (token: string) => Promise<T>) {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) {
        throw new Error("未获取到登录凭证，请重新登录")
      }
      return runner(token)
    },
    []
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [summaryData, alertsData] = await withToken((token) =>
        Promise.all([
          getHealthSummary(token),
          getHealthAlerts(token, showAll ? undefined : false),
        ])
      )
      setSummary(summaryData)
      setAlerts(alertsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载健康数据失败")
    } finally {
      setLoading(false)
    }
  }, [withToken, showAll])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAcknowledge = async (id: number) => {
    try {
      await withToken((token) => acknowledgeHealthAlert(token, id))
      // Optimistic update
      setAlerts((prev) => {
        if (!showAll) {
          return prev.filter((a) => a.id !== id)
        }
        return prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
      })
    } catch (err) {
      console.error("Failed to acknowledge alert", err)
    }
  }

  const getAlertBadge = (type: string) => {
    switch (type) {
      case "fatigue":
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-200">疲劳</Badge>
      case "posture":
        return <Badge variant="destructive">坐姿</Badge>
      case "break_needed":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">休息</Badge>
      case "stress":
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-200">压力</Badge>
      default:
        return <Badge variant="outline">通知</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均专注度</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? Math.round(summary.avgFocusScore * 100) : "-"}%
            </div>
            <p className="text-xs text-muted-foreground">
              基于最近学习会话分析
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均疲劳度</CardTitle>
            <HeartPulse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? Math.round(summary.avgFatigueLevel * 100) : "-"}%
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.avgFatigueLevel && summary.avgFatigueLevel > 0.7 ? "建议适当休息" : "状态良好"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">坐姿健康度</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? Math.round((summary.postureDistribution.good / (summary.postureDistribution.good + summary.postureDistribution.slouching + summary.postureDistribution.tooClose || 1)) * 100) : "-"}%
            </div>
            <p className="text-xs text-muted-foreground">
              良好坐姿占比
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>健康预警</CardTitle>
            <CardDescription>实时监测到的健康风险与建议</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowAll(!showAll)}>
            {showAll ? "隐藏已处理" : "显示全部"}
          </Button>
        </CardHeader>
        <CardContent>
          {loading && !alerts.length ? (
            <p className="text-sm text-muted-foreground">加载中...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无未处理的健康预警</p>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getAlertBadge(alert.alertType)}
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleString("zh-CN")}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{alert.message}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleAcknowledge(alert.id)}
                    disabled={alert.acknowledged}
                    title="标记为已读"
                  >
                    <Check className={`h-4 w-4 ${alert.acknowledged ? "text-muted-foreground" : "text-primary"}`} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
