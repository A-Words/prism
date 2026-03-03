// app/(dashboard)/health/page.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'  // 添加这行
import { Progress } from '@/components/ui/progress'

export default function HealthPage() {
  const [focusTime] = useState(150) // 分钟
  const [suggestedBreak] = useState(15) // 分钟

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">💚 学习健康管理</h1>
        <p className="text-muted-foreground mt-2">
          学习强度监测 · 智能休息建议 · 坐姿检测
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 学习强度监测 */}
        <Card>
          <CardHeader>
            <CardTitle>今日学习强度</CardTitle>
            <CardDescription>专注时长统计</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-bold text-primary">
              {Math.floor(focusTime / 60)}h {focusTime % 60}m
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>今日目标</span>
                <span>4h</span>
              </div>
              <Progress value={(focusTime / 240) * 100} className="h-2" />
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">建议休息 {suggestedBreak} 分钟</span>
                <br />
                连续学习时间较长，适当休息可以提高学习效率
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 坐姿检测 */}
        <Card>
          <CardHeader>
            <CardTitle>坐姿检测</CardTitle>
            <CardDescription>实时姿势分析</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center h-32 bg-green-50 rounded-lg">
              <div className="text-center">
                <div className="text-5xl mb-2">✅</div>
                <span className="text-green-700 font-medium">坐姿良好</span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              保持当前坐姿，记得定时起身活动
            </div>
          </CardContent>
        </Card>

        {/* 疲劳度监测 */}
        <Card>
          <CardHeader>
            <CardTitle>疲劳度监测</CardTitle>
            <CardDescription>基于学习时长和操作行为</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold text-orange-500">中度疲劳</div>
            </div>
            <Progress value={65} className="h-2" />
            <p className="text-sm text-muted-foreground">
              建议进行短暂休息，闭目养神5分钟
            </p>
          </CardContent>
        </Card>

        {/* 心理健康关注 */}
        <Card>
          <CardHeader>
            <CardTitle>心理健康关注</CardTitle>
            <CardDescription>情绪状态分析</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">😊</span>
              <span className="font-medium">情绪状态良好</span>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                保持积极心态，如果感到压力过大，
                <Button variant="link" className="p-0 h-auto text-blue-800 underline">
                  点击获取心理支持资源
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}