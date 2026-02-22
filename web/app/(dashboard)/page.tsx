// app/(dashboard)/page.tsx
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="space-y-8">
      {/* 欢迎语 */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          欢迎回来，{user?.email?.split('@')[0] || '学习者'}
        </h1>
        <p className="text-muted-foreground mt-2">
          这是您的AI学习仪表盘，今天也要加油哦！
        </p>
      </div>

      {/* 六大核心功能卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. 学习路径规划 */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-2">
              <span className="text-2xl">🗺️</span>
            </div>
            <CardTitle>智能个性化学习路径</CardTitle>
            <CardDescription>
              知识追踪与状态建模，动态路径优化
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <a href="/dashboard/learning-path">查看详情</a>
            </Button>
          </CardContent>
        </Card>

        {/* 2. 情绪智能干预 */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-2">
              <span className="text-2xl">🎭</span>
            </div>
            <CardTitle>情绪智能干预系统</CardTitle>
            <CardDescription>
              多模态情绪识别，实时状态监测与干预
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <a href="/dashboard/ai-assistant">查看详情</a>
            </Button>
          </CardContent>
        </Card>

        {/* 3. 智能虚拟助教 */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
              <span className="text-2xl">🤖</span>
            </div>
            <CardTitle>智能虚拟助教</CardTitle>
            <CardDescription>
              24小时智能问答，知识图谱增强
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <a href="/dashboard/ai-assistant">查看详情</a>
            </Button>
          </CardContent>
        </Card>

        {/* 4. 智能笔记助手 */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
              <span className="text-2xl">📝</span>
            </div>
            <CardTitle>智能笔记助手</CardTitle>
            <CardDescription>
              多模态输入，知识结构化，语义检索
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <a href="/dashboard/notes">查看详情</a>
            </Button>
          </CardContent>
        </Card>

        {/* 5. 学习健康管理 */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-2">
              <span className="text-2xl">💚</span>
            </div>
            <CardTitle>学习健康管理</CardTitle>
            <CardDescription>
              学习强度监测，智能休息建议，坐姿检测
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <a href="/dashboard/health">查看详情</a>
            </Button>
          </CardContent>
        </Card>

        {/* 6. 跨场景智适应 */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
              <span className="text-2xl">🔄</span>
            </div>
            <CardTitle>跨场景智适应</CardTitle>
            <CardDescription>
              场景感知，课堂/自习/考前无缝衔接
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <a href="/dashboard/learning-path">查看详情</a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 系统架构概览 */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight mb-6">🏗️ 系统架构</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-blue-500">🌐</span>
                Web Client
              </CardTitle>
              <CardDescription>Next.js 16, React, Tailwind</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">用户交互界面</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-green-500">⚙️</span>
                Api Gateway
              </CardTitle>
              <CardDescription>Go 1.25, Gin, GORM</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">业务逻辑编排</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-purple-500">🧠</span>
                AI Engine
              </CardTitle>
              <CardDescription>Python 3.14, FastAPI, LangChain</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">多模态分析</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}