import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PredictionPanel } from "@/components/learning-path/prediction-panel"
import { predictionFixture } from "@/tests/fixtures/learning-path"

describe("PredictionPanel", () => {
  it("renders empty state", () => {
    render(<PredictionPanel prediction={null} />)
    expect(screen.getByText("尚未生成预测，请先完成测评并加载路径。")).toBeInTheDocument()
  })

  it("renders prediction details", () => {
    render(<PredictionPanel prediction={predictionFixture} />)
    expect(screen.getByText("学习效果预测")).toBeInTheDocument()
    expect(screen.getByText("整体提升概率：81%")).toBeInTheDocument()
    expect(screen.getByText("最近 7 天练习稳定，预计掌握率持续提升。")).toBeInTheDocument()
    expect(screen.getByText("一元一次方程")).toBeInTheDocument()
    expect(screen.getByText("86%")).toBeInTheDocument()
  })
})
