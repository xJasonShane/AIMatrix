import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { NavProvider, useNav, useCollapse } from './useNavStore'
import raw from '../data/navigation.json'

const wrapper = ({ children }: { children: ReactNode }) => (
  <NavProvider>{children}</NavProvider>
)

beforeEach(() => localStorage.clear())

describe('useNavStore', () => {
  it('exposes validated categories from navigation.json', () => {
    const { result } = renderHook(() => useNav(), { wrapper })
    expect(result.current.data.categories).toHaveLength(
      (raw as { categories: unknown[] }).categories.length,
    )
    expect(result.current.error).toBeNull()
  })

  it('stores collapsed categories in localStorage', () => {
    const { result } = renderHook(() => useCollapse(), { wrapper })
    expect(result.current.isCollapsed('chat')).toBe(false)
    act(() => result.current.toggleCollapse('chat'))
    expect(result.current.isCollapsed('chat')).toBe(true)
    expect(localStorage.getItem('aimatrix:collapsed')).toContain('chat')
  })

  it('collapses and expands all categories at once, persisting to localStorage', () => {
    const { result } = renderHook(() => useCollapse(), { wrapper })
    const allIds = (raw as { categories: { id: string }[] }).categories.map((c) => c.id)
    act(() => result.current.setAllCollapsed(true))
    allIds.forEach((id) => expect(result.current.isCollapsed(id)).toBe(true))
    const stored = JSON.parse(localStorage.getItem('aimatrix:collapsed') ?? '[]')
    expect(stored).toEqual(expect.arrayContaining(allIds))
    act(() => result.current.setAllCollapsed(false))
    allIds.forEach((id) => expect(result.current.isCollapsed(id)).toBe(false))
    expect(localStorage.getItem('aimatrix:collapsed')).toBe('[]')
  })

  it('falls back to memory when localStorage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { result } = renderHook(() => useCollapse(), { wrapper })
    expect(() => act(() => result.current.toggleCollapse('chat'))).not.toThrow()
    spy.mockRestore()
  })
})
