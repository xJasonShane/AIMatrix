import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, act, cleanup, fireEvent } from '@testing-library/react'
import { createElement } from 'react'
import { columnCount, prefersReducedMotion, MatrixRain } from './MatrixRain'

/** 等一帧：让 rAF 合并回调执行（包在 act 内避免状态更新警告） */
const flushFrame = () =>
  act(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  })

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

  it('coalesces rapid resize events into one canvas relayout per frame', async () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
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
    // 初始挂载执行一次尺寸设置（setTransform 一次）
    expect(ctxStub.setTransform).toHaveBeenCalledTimes(1)

    // 同一帧内连续触发多次 resize：同步阶段不重复计算
    fireEvent(window, new Event('resize'))
    fireEvent(window, new Event('resize'))
    expect(ctxStub.setTransform).toHaveBeenCalledTimes(1)

    // 下一帧仅合并重算一次
    await flushFrame()
    expect(ctxStub.setTransform).toHaveBeenCalledTimes(2)
  })
})
