import { it, expect, describe, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
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

// 位置探针：捕获 MemoryRouter 内当前 search，供 URL 同步断言（effect 中记录，避免渲染期副作用）
let currentSearch = ''
function SearchProbe() {
  const { search } = useLocation()
  useEffect(() => {
    currentSearch = search
  }, [search])
  return null
}

// m 组件的动画/手势特性需由 LazyMotion 提供（生产环境由 App 统一注入）
const renderPage = (initialPath = '/matrix') => {
  currentSearch = ''
  return render(
    <LazyMotion features={domAnimation} strict>
      <MemoryRouter initialEntries={[initialPath]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <NavProvider>
          <MatrixPage />
          <SearchProbe />
        </NavProvider>
      </MemoryRouter>
    </LazyMotion>,
  )
}

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

  it('filters tree nodes by the matrix search and shows a no-match hint', async () => {
    renderPage()
    triggerResize()
    await flushFrame()
    const input = screen.getByPlaceholderText('搜索矩阵节点…')
    // 命中：ChatGPT 分类内有匹配（导航数据含 ChatGPT）
    fireEvent.change(input, { target: { value: 'chat' } })
    expect(screen.queryByRole('status')).toBeNull()
    // 未命中：空态提示出现
    fireEvent.change(input, { target: { value: 'zzz 不存在' } })
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.getByText(/没有匹配/)).toBeTruthy()
    // Esc 清空搜索词
    fireEvent.keyDown(input, { key: 'Escape' })
    expect((input as HTMLInputElement).value).toBe('')
  })

  it('restores the search query from the URL (?q=) and syncs edits back', async () => {
    renderPage('/matrix?q=chat')
    triggerResize()
    await flushFrame()
    // URL 预置查询回填输入框并直接作用于树（命中无空态）
    const input = screen.getByPlaceholderText('搜索矩阵节点…') as HTMLInputElement
    expect(input.value).toBe('chat')
    expect(screen.queryByRole('status')).toBeNull()
    // 键入新查询同步写入 URL；Esc 清空同步移除参数
    fireEvent.change(input, { target: { value: 'midjourney' } })
    expect(currentSearch).toBe('?q=midjourney')
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(currentSearch).toBe('')
  })
})
