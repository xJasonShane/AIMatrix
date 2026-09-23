import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ErrorBoundary } from './ErrorBoundary'

/** 可控崩溃组件：shouldThrow 为 true 时抛错，用于验证重试恢复 */
let shouldThrow = false
function MaybeBoom() {
  if (shouldThrow) throw new Error('boom 渲染崩溃')
  return <p>视图已恢复</p>
}

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    shouldThrow = false
    vi.restoreAllMocks()
  })

  it('renders the fallback card when a child throws during render', () => {
    // React 会在测试中打印捕获的错误，静默以保持输出干净
    vi.spyOn(console, 'error').mockImplementation(() => {})
    shouldThrow = true
    renderWithRouter(
      <ErrorBoundary>
        <MaybeBoom />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeVisible()
    expect(screen.getByText(/boom 渲染崩溃/)).toBeVisible()
    expect(screen.getByRole('button', { name: '重试' })).toBeVisible()
    expect(screen.getByRole('link', { name: /返回导航视图/ })).toBeVisible()
  })

  it('recovers via retry after the child stops throwing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    shouldThrow = true
    renderWithRouter(
      <ErrorBoundary>
        <MaybeBoom />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeVisible()

    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    expect(screen.getByText('视图已恢复')).toBeVisible()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('renders children normally when nothing throws', () => {
    renderWithRouter(
      <ErrorBoundary>
        <p>正常内容</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('正常内容')).toBeVisible()
  })
})
