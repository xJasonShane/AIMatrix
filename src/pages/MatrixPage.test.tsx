import { it, expect, describe, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LazyMotion, domAnimation } from 'framer-motion'
import { NavProvider } from '../store/useNavStore'
import { MatrixPage } from './MatrixPage'

// jsdom 无 ResizeObserver：记录实例，便于手动触发尺寸回调
const roInstances: { cb: ResizeObserverCallback }[] = []
class ResizeObserverStub {
  constructor(cb: ResizeObserverCallback) {
    roInstances.push({ cb })
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

// m 组件的动画/手势特性需由 LazyMotion 提供（生产环境由 App 统一注入）
const renderPage = () =>
  render(
    <LazyMotion features={domAnimation} strict>
      <MemoryRouter>
        <NavProvider>
          <MatrixPage />
        </NavProvider>
      </MemoryRouter>
    </LazyMotion>,
  )

const triggerResize = () =>
  act(() => {
    roInstances[0].cb([], {} as unknown as ResizeObserver)
  })

/** 等待 rAF 节流帧应用最新尺寸（包在 act 内避免状态更新警告） */
const flushFrame = () =>
  act(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  })

beforeEach(() => {
  roInstances.length = 0
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  // jsdom 无 canvas 实现：墨雨对 null ctx 已有降级，打桩去除噪声输出
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('MatrixPage', () => {
  it('measures the content area and renders the radial tree after the measured size arrives', async () => {
    renderPage()
    expect(screen.getByRole('banner')).toBeTruthy()
    expect(roInstances).toHaveLength(1)
    // 实测尺寸未知时不渲染径向树，避免 0×0 闪烁
    expect(screen.queryByRole('group', { name: 'AI 工具矩阵树' })).toBeNull()
    triggerResize()
    // rAF 节流：尺寸在下一帧才应用
    expect(screen.queryByRole('group', { name: 'AI 工具矩阵树' })).toBeNull()
    await flushFrame()
    expect(screen.getByRole('group', { name: 'AI 工具矩阵树' })).toBeTruthy()
  })

  it('coalesces rapid resize callbacks into one relayout with the latest size', async () => {
    renderPage()
    const main = document.querySelector('.matrix-main') as HTMLElement
    let width = 100
    Object.defineProperty(main, 'clientWidth', { configurable: true, get: () => width })
    Object.defineProperty(main, 'clientHeight', { configurable: true, get: () => 600 })
    triggerResize()
    width = 200
    triggerResize()
    // 同步阶段不重算：同一帧内的多次回调被合并
    expect(screen.queryByRole('group', { name: 'AI 工具矩阵树' })).toBeNull()
    await flushFrame()
    // 合并后仅重算一次，且采用最新尺寸
    expect(screen.getByRole('group', { name: 'AI 工具矩阵树' })).toHaveAttribute('width', '200')
  })

  it('requests fullscreen and reflects fullscreenchange in the button label', () => {
    renderPage()
    const enterBtn = screen.getByRole('button', { name: '进入全屏' })
    const rfSpy = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: rfSpy,
    })
    fireEvent.click(enterBtn)
    expect(rfSpy).toHaveBeenCalled()

    // 模拟浏览器进入全屏后派发 fullscreenchange
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => document.documentElement,
    })
    fireEvent(document, new Event('fullscreenchange'))
    expect(screen.getByRole('button', { name: '退出全屏' })).toBeTruthy()
  })
})
