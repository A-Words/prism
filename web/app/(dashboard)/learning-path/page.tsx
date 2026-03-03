// app/(dashboard)/learning-path/page.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type NodeStatus = "mastered" | "pending" | "review"

interface PathNode {
  id: number
  title: string
  subject: string
  status: NodeStatus
  mastery: number
  prerequisiteIds: number[]
  isCurrent: boolean
  predictedImproveProb: number
}

// 模拟数据
const mockNodes: PathNode[] = [
  {
    id: 1,
    title: '算术基础',
    subject: 'math',
    status: 'mastered',
    mastery: 0.95,
    prerequisiteIds: [],
    isCurrent: false,
    predictedImproveProb: 0.1
  },
  {
    id: 2,
    title: '代数入门',
    subject: 'math',
    status: 'pending',
    mastery: 0.3,
    prerequisiteIds: [1],
    isCurrent: true,
    predictedImproveProb: 0.7
  },
  {
    id: 3,
    title: '几何基础',
    subject: 'math',
    status: 'pending',
    mastery: 0.2,
    prerequisiteIds: [1],
    isCurrent: false,
    predictedImproveProb: 0.8
  },
  {
    id: 4,
    title: '函数与方程',
    subject: 'math',
    status: 'review',
    mastery: 0.6,
    prerequisiteIds: [2, 3],
    isCurrent: false,
    predictedImproveProb: 0.4
  }
]

export default function LearningPathPage() {
  const [selectedNode, setSelectedNode] = useState<PathNode | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  const getStatusColor = (status: NodeStatus) => {
    switch(status) {
      case 'mastered': return 'bg-green-500'
      case 'pending': return 'bg-blue-500'
      case 'review': return 'bg-orange-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusBadge = (status: NodeStatus) => {
    switch(status) {
      case 'mastered': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">已掌握</Badge>
      case 'pending': return <Badge variant="secondary">待学习</Badge>
      case 'review': return <Badge variant="outline">需复习</Badge>
    }
  }

  const handleNodeClick = (node: PathNode) => {
    setSelectedNode(node)
    setShowDetail(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">数学学习路径</h1>
          <p className="text-muted-foreground mt-1">
            目标日期：2026年3月1日 · 整体完成概率 75%
          </p>
        </div>
        <Button>
          <span className="mr-2">▶</span>
          开始学习
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧知识图谱 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>知识图谱</CardTitle>
              <CardDescription>
                点击节点查看详情 · 绿色=已掌握 · 蓝色=待学习 · 橙色=需复习
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 relative min-h-[400px]">
                {/* 连接线 */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <line x1="12.5%" y1="80px" x2="12.5%" y2="180px" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5"/>
                  <line x1="12.5%" y1="80px" x2="37.5%" y2="180px" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5"/>
                  <line x1="12.5%" y1="180px" x2="87.5%" y2="280px" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5"/>
                  <line x1="37.5%" y1="180px" x2="87.5%" y2="280px" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5"/>
                </svg>

                {/* 节点 */}
                {mockNodes.map((node, index) => (
                  <div
                    key={node.id}
                    className="cursor-pointer transition-transform hover:scale-105"
                    style={{
                      gridColumn: index === 0 ? 1 : index === 1 ? 1 : index === 2 ? 2 : 4,
                      gridRow: index < 2 ? 1 : 2
                    }}
                    onClick={() => handleNodeClick(node)}
                  >
                    <div className={`
                      p-4 rounded-lg border-2 text-center
                      ${node.status === 'mastered' ? 'border-green-500 bg-green-50' :
                        node.status === 'pending' ? 'border-blue-500 bg-blue-50' :
                        'border-orange-500 bg-orange-50'}
                      ${node.isCurrent ? 'ring-4 ring-blue-300' : ''}
                    `}>
                      <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${getStatusColor(node.status)}`} />
                      <div className="font-medium text-sm">{node.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        掌握度: {Math.round(node.mastery * 100)}%
                      </div>
                      <div className="mt-2">
                        {getStatusBadge(node.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧预测面板 */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>学习效果预测</CardTitle>
              <CardDescription>基于当前进度的完成概率</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">75%</div>
                <div className="text-sm text-muted-foreground mt-1">整体完成概率</div>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm">
                  根据您当前的学习进度，完成本路径的概率为75%。建议优先学习前置知识点。
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-sm">各知识点概率</h4>
                {mockNodes.map(node => (
                  <div key={node.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{node.title}</span>
                      <span className="font-medium">{Math.round(node.mastery * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getStatusColor(node.status)}`}
                        style={{ width: `${node.mastery * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 详情弹窗 */}
      {showDetail && selectedNode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle>{selectedNode.title}</CardTitle>
              <CardDescription>知识点详情</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                {getStatusBadge(selectedNode.status)}
                {selectedNode.isCurrent && (
                  <Badge variant="outline">当前节点</Badge>
                )}
              </div>
              
              <div className="space-y-2 text-sm">
                <p>掌握度：{Math.round(selectedNode.mastery * 100)}%</p>
                <p>预测提升概率：{Math.round(selectedNode.predictedImproveProb * 100)}%</p>
                <p>学科：数学</p>
              </div>

              <div className="text-sm">
                <p className="font-medium mb-2">前置知识点：</p>
                <div className="flex flex-wrap gap-2">
                  {selectedNode.prerequisiteIds.length > 0 ? (
                    selectedNode.prerequisiteIds.map(id => {
                      const prereq = mockNodes.find(n => n.id === id)
                      return prereq ? (
                        <Badge key={id} variant="outline">{prereq.title}</Badge>
                      ) : null
                    })
                  ) : (
                    <span className="text-muted-foreground">无前置依赖</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowDetail(false)}>
                  关闭
                </Button>
                <Button onClick={() => {
                  setShowDetail(false)
                  // 这里可以添加开始学习的逻辑
                }}>
                  开始学习
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}