"use client"

import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { PathNodeDTO } from "@/lib/types/learning-path"

type NodeDetailSheetProps = {
  node: PathNodeDTO | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const statusLabel: Record<string, string> = {
  mastered: "已掌握",
  pending: "待学习",
  review: "需复习",
}

export function NodeDetailSheet({ node, open, onOpenChange }: NodeDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{node?.title ?? "知识点详情"}</SheetTitle>
          <SheetDescription>查看知识点状态、依赖关系与预测提升概率。</SheetDescription>
        </SheetHeader>

        {node ? (
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-2">
              <Badge>{statusLabel[node.status]}</Badge>
              {node.isCurrent ? <Badge variant="secondary">当前节点</Badge> : null}
              {node.isSkipped ? <Badge variant="outline">已跳过</Badge> : null}
            </div>

            <div className="space-y-1 text-sm">
              <p>掌握度：{Math.round(node.mastery * 100)}%</p>
              <p>预测提升概率：{Math.round(node.predictedImproveProb * 100)}%</p>
              <p>学科：{node.subject}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">前置知识点</p>
              {node.prerequisiteIds.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {node.prerequisiteIds.map((id) => (
                    <Badge key={id} variant="outline">
                      #{id}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">无前置依赖</p>
              )}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
