"use client"

import { useEffect, useMemo, useRef } from "react"
import * as echarts from "echarts"

import { LearningPathDTO, PathNodeDTO } from "@/lib/types/learning-path"

const statusColor: Record<string, string> = {
  mastered: "#22c55e",
  pending: "#3b82f6",
  review: "#f59e0b",
}

type PathDagChartProps = {
  path: LearningPathDTO
  onNodeClick?: (node: PathNodeDTO) => void
}

export function PathDagChart({ path, onNodeClick }: PathDagChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const nodeMap = useMemo(() => new Map(path.nodes.map((node) => [node.id, node])), [path.nodes])

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const chart = echarts.init(containerRef.current)

    const graphNodes = path.nodes.map((node, index) => ({
      id: String(node.id),
      name: node.title,
      value: node.mastery,
      x: (index % 4) * 220,
      y: Math.floor(index / 4) * 140,
      itemStyle: {
        color: statusColor[node.status] ?? "#64748b",
        borderColor: node.isCurrent ? "#0f172a" : "#ffffff",
        borderWidth: node.isCurrent ? 3 : 1,
      },
      label: {
        show: true,
        formatter: `${node.title}\n掌握度 ${Math.round(node.mastery * 100)}%`,
        fontSize: 12,
      },
      symbolSize: node.isSkipped ? 42 : 56,
    }))

    const graphLinks = path.edges.map((edge) => ({
      source: String(edge.from),
      target: String(edge.to),
      lineStyle: { color: "#94a3b8", width: 1.5 },
    }))

    chart.setOption({
      animationDuration: 600,
      tooltip: { trigger: "item" },
      xAxis: { show: false, min: -80, max: 900 },
      yAxis: { show: false, min: -80, max: 700 },
      series: [
        {
          type: "graph",
          coordinateSystem: "cartesian2d",
          layout: "none",
          roam: true,
          data: graphNodes,
          links: graphLinks,
          edgeSymbol: ["none", "arrow"],
          edgeSymbolSize: [0, 8],
          lineStyle: { opacity: 0.9 },
        },
      ],
    })

    chart.on("click", (params) => {
      const data = params?.data as { id?: string | number } | undefined
      const nodeId = Number(data?.id)
      if (!Number.isFinite(nodeId)) {
        return
      }
      const node = nodeMap.get(nodeId)
      if (node) {
        onNodeClick?.(node)
      }
    })

    const onResize = () => chart.resize()
    window.addEventListener("resize", onResize)

    return () => {
      window.removeEventListener("resize", onResize)
      chart.dispose()
    }
  }, [nodeMap, onNodeClick, path.edges, path.nodes])

  return <div ref={containerRef} className="h-[460px] w-full rounded-lg border bg-background" />
}
