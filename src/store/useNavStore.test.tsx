import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { NavProvider, useNav, useCollapse } from './useNavStore'
import type { NavData } from '../data/schema'
import raw from '../../public/data/navigation.json'

const realData = raw as NavData

const wrapper = ({ children }: { children: ReactNode }) => (
  <NavProvider initialData={realData}>{children}</NavProvider>
)

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('useNavStore (initialData injected)', () => {
  it('exposes validated categories synchronously when initialData is provided', () => {
    const { result } = renderHook(() => useNav(), { wrapper })
    expect(result.current.data.categories).toHaveLength(realData.categories.length)
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(false)
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
    const allIds = realData.categories.map((c) => c.id)
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

describe('useNavStore (runtime fetch)', () => {
  it('loads and validates data from ./data/navigation.json', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve(realData) }),
      ) as unknown as typeof fetch,
    )
    const { result } = renderHook(() => useNav(), {
      wrapper: ({ children }: { children: ReactNode }) => <NavProvider>{children}</NavProvider>,
    })
    // 首帧：加载中、空数据
    expect(result.current.loading).toBe(true)
    expect(result.current.data.categories).toHaveLength(0)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data.categories).toHaveLength(realData.categories.length)
    expect(result.current.error).toBeNull()
    expect(vi.mocked(fetch)).toHaveBeenCalledWith('./data/navigation.json', { cache: 'no-cache' })
  })

  it('surfaces fetch failure (e.g. missing file) as an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 404 })) as unknown as typeof fetch,
    )
    const { result } = renderHook(() => useNav(), {
      wrapper: ({ children }: { children: ReactNode }) => <NavProvider>{children}</NavProvider>,
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toContain('404')
    expect(result.current.data.categories).toHaveLength(0)
  })

  it('surfaces validation failure as an error with the field path', async () => {
    const bad = { categories: [{ id: 'c', name: 'C', links: [{ id: 'l', name: 'L' }] }] }
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve(bad) }),
      ) as unknown as typeof fetch,
    )
    const { result } = renderHook(() => useNav(), {
      wrapper: ({ children }: { children: ReactNode }) => <NavProvider>{children}</NavProvider>,
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toContain('categories[0].links[0].url')
  })
})
