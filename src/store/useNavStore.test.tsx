import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { NavProvider, useNav } from './useNavStore'
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

  it('computes angle ranges for every category', () => {
    const { result } = renderHook(() => useNav(), { wrapper })
    expect(result.current.angles).toHaveLength(result.current.data.categories.length)
  })

  it('stores collapsed categories in localStorage', () => {
    const { result } = renderHook(() => useNav(), { wrapper })
    expect(result.current.isCollapsed('chat')).toBe(false)
    act(() => result.current.toggleCollapse('chat'))
    expect(result.current.isCollapsed('chat')).toBe(true)
    expect(localStorage.getItem('aimatrix:collapsed')).toContain('chat')
  })

  it('falls back to memory when localStorage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { result } = renderHook(() => useNav(), { wrapper })
    expect(() => act(() => result.current.toggleCollapse('chat'))).not.toThrow()
    spy.mockRestore()
  })
})
