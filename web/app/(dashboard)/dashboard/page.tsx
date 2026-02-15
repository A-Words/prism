import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>智能学习路径</CardTitle>
          <CardDescription>根据测评和做题表现自动规划后续学习路线。</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/assessment">进入测评中心</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>可视化路线图</CardTitle>
          <CardDescription>DAG 展示知识点依赖、掌握状态与预测提升概率。</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="secondary">
            <Link href="/learning-path">查看学习路径</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
