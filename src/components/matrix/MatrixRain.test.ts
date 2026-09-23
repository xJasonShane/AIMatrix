import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, act, cleanup } from '@testing-library/react'
import { createElement } from 'react'
import { columnCount, prefersReducedMotion, MatrixRain } from './MatrixRain'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('columnCount', () => {
  it('fills the width by column width', () => {
    expect(columnCount(140, 14)).toBe(10)
    expect(columnCount(147, 14)).toBe(11)
    expect(columnCount(0, 14)).toBe(0)
  })
})

describe('prefersReducedMotion', () => {
  it('is false when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(prefersReducedMotion()).toBe(false)
    vi.unstubAllGlobals()
  })
})

describe('MatrixRain reduced-motion', () => {
  it('redraws the static pattern when the system preference changes at runtime', () => {
    let mqListener: (() => void) | null = null
    const matches = { value: false }
    vi.stubGlobal('matchMedia', () => ({
      get matches() {
        return matches.value
      },
      addEventListener: (_type: string, cb: () => void) => {
        mqListener = cb
      },
      removeEventListener: () => {
        mqListener = null
      },
    }))
    const ctxStub = {
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      font: '',
      fillStyle: '',
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctxStub as never)

    render(createElement(MatrixRain))
    // 动效模式下首帧前不会绘制（静态点阵的 clearRect 尚未被调用）
    expect(ctxStub.clearRect).not.toHaveBeenCalled()

    // 模拟用户在系统设置中开启"减弱动态效果"
    matches.value = true
    act(() => mqListener?.())

    // 偏好切换即时生效：立即重绘静止点阵
    expect(ctxStub.clearRect).toHaveBeenCalled()
    expect(ctxStub.fillText).toHaveBeenCalled()
  })
})
