import { describe, it, expect, vi } from 'vitest'
import { columnCount, prefersReducedMotion } from './MatrixRain'

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
