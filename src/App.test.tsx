import { it, expect, describe, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

// jsdom 无 ResizeObserver（矩阵视图用到）
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// navigation.json mock：默认透传真实数据；测试经 globalThis 覆盖以触发数据错误降级
vi.mock('./data/navigation.json', async (importOriginal) => {
  const actual = await importOriginal<{ default: unknown }>()
  return {
    get default() {
      const override = (globalThis as { __navRawOverride?: unknown }).__navRawOverride
      return override ?? actual.default
    },
  }
})

const navOverride = (value: unknown) => {
  ;(globalThis as { __navRawOverride?: unknown }).__navRawOverride = value
}

const renderApp = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  // jsdom 无 canvas 实现：墨雨对 null ctx 已有降级，打桩去除噪声输出
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  delete (globalThis as { __navRawOverride?: unknown }).__navRawOverride
})

describe('App shell', () => {
  it('renders the nav view at /nav', () => {
    renderApp('/nav')
    expect(screen.getByRole('heading', { level: 1, name: '个人 AI 工具矩阵' })).toBeTruthy()
  })

  it('provides a skip link targeting the main content', () => {
    renderApp('/nav')
    const skip = screen.getByRole('link', { name: '跳到主内容' })
    expect(skip).toHaveAttribute('href', '#main-content')
    expect(document.getElementById('main-content')).toBeTruthy()
  })

  it('redirects unknown routes to the nav view', () => {
    renderApp('/does-not-exist')
    expect(screen.getByRole('heading', { level: 1, name: '个人 AI 工具矩阵' })).toBeTruthy()
  })

  it('renders the matrix view at /matrix', () => {
    renderApp('/matrix')
    expect(screen.getByRole('button', { name: '进入全屏' })).toBeTruthy()
    expect(document.getElementById('main-content')).toBeTruthy()
  })

  it('mounts the command palette outside the routed container', () => {
    renderApp('/nav')
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
  })

  it('shows the full-screen data error page instead of a blank screen when navigation.json is invalid', () => {
    // 缺 url 字段：validateNavData 抛错 → Shell 走 error 分支
    navOverride({
      categories: [
        { id: 'chat', name: '对话助手', links: [{ id: 'gpt', name: 'ChatGPT', description: '' }] },
      ],
    })
    renderApp('/nav')
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText(/categories\[0\]\.links\[0\]\.url/)).toBeTruthy()
    expect(screen.queryByRole('heading', { level: 1, name: '个人 AI 工具矩阵' })).toBeNull()
  })
})
