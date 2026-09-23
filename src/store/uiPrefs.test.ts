import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  pushRecentLink,
  getRecentLinks,
  subscribeRecentLinks,
  toggleFavorite,
  getFavorites,
  subscribeFavorites,
  setFavorites,
  setRecentLinks,
} from './uiPrefs'

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

describe('favorites', () => {
  it('toggles: first call adds (newest first), second call removes', () => {
    expect(getFavorites()).toEqual([])
    toggleFavorite('a')
    expect(getFavorites()).toEqual(['a'])
    toggleFavorite('b')
    // 最新收藏在前
    expect(getFavorites()).toEqual(['b', 'a'])
    toggleFavorite('b')
    expect(getFavorites()).toEqual(['a'])
  })

  it('persists to localStorage', () => {
    toggleFavorite('gpt')
    expect(localStorage.getItem('aimatrix:favorites')).toContain('gpt')
  })

  it('notifies subscribers on toggle and stops after unsubscribe', () => {
    let calls = 0
    const unsub = subscribeFavorites(() => {
      calls += 1
    })
    toggleFavorite('a')
    expect(calls).toBe(1)
    unsub()
    toggleFavorite('a')
    expect(calls).toBe(1)
  })
})

describe('bulk setters (backup import)', () => {
  it('setFavorites overwrites the whole list and notifies subscribers', () => {
    toggleFavorite('old')
    let calls = 0
    const unsub = subscribeFavorites(() => {
      calls += 1
    })
    setFavorites(['a', 'b'])
    expect(getFavorites()).toEqual(['a', 'b'])
    expect(calls).toBe(1)
    unsub()
  })

  it('setRecentLinks overwrites the whole list and notifies subscribers', () => {
    pushRecentLink('old')
    let calls = 0
    const unsub = subscribeRecentLinks(() => {
      calls += 1
    })
    setRecentLinks(['x', 'y'])
    expect(getRecentLinks()).toEqual(['x', 'y'])
    expect(calls).toBe(1)
    unsub()
  })
})
