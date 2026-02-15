import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PredictionDTO } from "@/lib/types/learning-path"

type PredictionPanelProps = {
  prediction: PredictionDTO | null
}

export function PredictionPanel({ prediction }: PredictionPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>学习效果预测</CardTitle>
        <CardDescription>展示路径整体提升概率与知识点明细概率。</CardDescription>
      </CardHeader>
      <CardContent>
        {prediction ? (
          <div className="space-y-3">
            <p className="text-sm">整体提升概率：{Math.round(prediction.overallProbability * 100)}%</p>
            <p className="text-sm text-muted-foreground">{prediction.rationale}</p>
            <ul className="space-y-1 text-sm">
              {prediction.nodeProbabilities.map((node) => (
                <li key={node.knowledgeId} className="flex items-center justify-between rounded-md border px-2 py-1">
                  <span>{node.title}</span>
                  <span>{Math.round(node.probability * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">尚未生成预测，请先完成测评并加载路径。</p>
        )}
      </CardContent>
    </Card>
  )
}
