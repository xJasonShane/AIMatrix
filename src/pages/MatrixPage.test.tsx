import { it, expect, describe, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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

const renderPage = () =>
  render(
    <MemoryRouter>
      <NavProvider>
        <MatrixPage />
      </NavProvider>
    </MemoryRouter>,
  )

const triggerResize = () =>
  act(() => {
    roInstances[0].cb([], {} as unknown as ResizeObserver)
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
  it('measures the content area and renders the radial tree only after size arrives', () => {
    renderPage()
    expect(screen.getByRole('banner')).toBeTruthy()
    expect(roInstances).toHaveLength(1)
    // 实测尺寸未知时不渲染径向树，避免 0×0 闪烁
    expect(screen.queryByRole('group', { name: 'AI 工具矩阵树' })).toBeNull()
    triggerResize()
    expect(screen.getByRole('group', { name: 'AI 工具矩阵树' })).toBeTruthy()
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
