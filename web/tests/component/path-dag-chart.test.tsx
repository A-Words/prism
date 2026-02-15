import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PathDagChart } from "@/components/learning-path/path-dag-chart"
import { learningPathFixture } from "@/tests/fixtures/learning-path"

const setOptionMock = vi.fn()
const onMock = vi.fn()
const resizeMock = vi.fn()
const disposeMock = vi.fn()
const initMock = vi.fn()

let clickHandler: ((params: { data?: { id?: string | number } }) => void) | undefined

vi.mock("echarts", () => ({
  init: (...args: unknown[]) => initMock(...args),
}))

describe("PathDagChart", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clickHandler = undefined
    onMock.mockImplementation((event: string, handler: typeof clickHandler) => {
      if (event === "click") {
        clickHandler = handler
      }
    })
    initMock.mockReturnValue({
      setOption: setOptionMock,
      on: onMock,
      resize: resizeMock,
      dispose: disposeMock,
    })
  })

  it("initializes chart and reacts to node click and resize", () => {
    const onNodeClick = vi.fn()
    const { unmount } = render(<PathDagChart path={learningPathFixture} onNodeClick={onNodeClick} />)

    expect(initMock).toHaveBeenCalledTimes(1)
    expect(setOptionMock).toHaveBeenCalledTimes(1)
    expect(onMock).toHaveBeenCalledWith("click", expect.any(Function))

    clickHandler?.({ data: { id: String(learningPathFixture.nodes[0].id) } })
    expect(onNodeClick).toHaveBeenCalledWith(learningPathFixture.nodes[0])

    clickHandler?.({ data: { id: "invalid" } })
    expect(onNodeClick).toHaveBeenCalledTimes(1)

    window.dispatchEvent(new Event("resize"))
    expect(resizeMock).toHaveBeenCalledTimes(1)

    unmount()
    expect(disposeMock).toHaveBeenCalledTimes(1)
  })
})
