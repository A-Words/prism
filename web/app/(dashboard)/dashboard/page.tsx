import Link from "next/link"
import { BookOpen, ClipboardList, Brain, NotebookPen, Activity, HeartPulse } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const modules = [
  {
    title: "测评中心",
    description: "冷启动测评与作业上传，自动批改并定位薄弱知识点。",
    href: "/assessment",
    icon: ClipboardList,
    variant: "default" as const,
  },
  {
    title: "学习路径",
    description: "DAG 可视化知识点依赖，动态规划最优学习路线。",
    href: "/learning-path",
    icon: BookOpen,
    variant: "secondary" as const,
  },
  {
    title: "虚拟导师",
    description: "AI 智能问答，多轮对话式答疑，知识图谱增强回复。",
    href: "/assistant",
    icon: Brain,
    variant: "default" as const,
  },
  {
    title: "智能笔记",
    description: "语音转写、OCR 识别、知识结构化与语义搜索。",
    href: "/notes",
    icon: NotebookPen,
    variant: "secondary" as const,
  },
  {
    title: "情绪与专注",
    description: "多模态情绪识别，注意力追踪，智能干预策略推荐。",
    href: "/emotion",
    icon: Activity,
    variant: "default" as const,
  },
  {
    title: "健康管理",
    description: "专注度趋势、疲劳检测、坐姿监控与智能休息建议。",
    href: "/health",
    icon: HeartPulse,
    variant: "secondary" as const,
  },
]

export default function DashboardPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {modules.map((mod) => (
        <Card key={mod.href}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <mod.icon className="size-5 text-muted-foreground" />
              <CardTitle>{mod.title}</CardTitle>
            </div>
            <CardDescription>{mod.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant={mod.variant}>
              <Link href={mod.href}>进入{mod.title}</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
