import { describe, it, expect, beforeEach, vi } from 'vitest'
import { pushRecentLink, getRecentLinks, subscribeRecentLinks } from './uiPrefs'

beforeEach(() => localStorage.clear())

describe('recent links', () => {
  it('dedupes and puts most recent first', () => {
    pushRecentLink('a')
    pushRecentLink('b')
    pushRecentLink('a')
    expect(getRecentLinks()).toEqual(['a', 'b'])
  })

  it('caps entries at max, dropping oldest', () => {
    for (let i = 0; i < 10; i++) pushRecentLink(`l${i}`, 6)
    expect(getRecentLinks()).toHaveLength(6)
    expect(getRecentLinks()[0]).toBe('l9')
    expect(getRecentLinks()).not.toContain('l0')
  })

  it('falls back to memory when localStorage throws', () => {
    // 注意：memory 回退是模块级状态，这里只验证行为（可读 + 最新置顶）
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => pushRecentLink('x')).not.toThrow()
    expect(getRecentLinks()[0]).toBe('x')
    expect(getRecentLinks()).toContain('x')
    spy.mockRestore()
  })

  it('notifies subscribers on push and stops after unsubscribe', () => {
    let calls = 0
    const unsub = subscribeRecentLinks(() => {
      calls += 1
    })
    pushRecentLink('a')
    expect(calls).toBe(1)
    unsub()
    pushRecentLink('b')
    expect(calls).toBe(1)
  })
})
