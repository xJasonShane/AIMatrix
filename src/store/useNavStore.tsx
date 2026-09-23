import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import raw from '../data/navigation.json'
import {
  validateNavData,
  type NavData,
} from '../data/schema'
import { uiPrefs } from './uiPrefs'

interface NavContextValue {
  data: NavData
  error: string | null
}

/** 折叠状态独立成 context：切换折叠不再触发消费 data 的组件重渲染 */
interface CollapseContextValue {
  isCollapsed: (categoryId: string) => boolean
  toggleCollapse: (categoryId: string) => void
  setAllCollapsed: (collapsed: boolean) => void
}

const NavContext = createContext<NavContextValue | null>(null)
const CollapseContext = createContext<CollapseContextValue | null>(null)

function readCollapsed(): Set<string> {
  const rawPref = uiPrefs.get(uiPrefs.KEY_COLLAPSED)
  if (!rawPref) return new Set()
  try {
    const arr = JSON.parse(rawPref)
    return new Set(Array.isArray(arr) ? (arr as string[]) : [])
  } catch {
    return new Set()
  }
}

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [parsed, error] = useMemo(() => {
    try {
      return [validateNavData(raw), null] as const
    } catch (e) {
      return [null, e instanceof Error ? e.message : String(e)] as const
    }
  }, [])

  const [collapsed, setCollapsed] = useState<Set<string>>(readCollapsed)

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      uiPrefs.set(uiPrefs.KEY_COLLAPSED, JSON.stringify([...next]))
      return next
    })
  }, [])

  /** 全部收起 / 全部展开：一次性写入持久化（分类列表来自已校验数据） */
  const setAllCollapsed = useCallback(
    (collapsed: boolean) => {
      const next = collapsed ? new Set(parsed?.categories.map((c) => c.id) ?? []) : new Set<string>()
      uiPrefs.set(uiPrefs.KEY_COLLAPSED, JSON.stringify([...next]))
      setCollapsed(next)
    },
    [parsed],
  )

  const navValue = useMemo<NavContextValue>(() => ({
    data: parsed ?? { categories: [] },
    error,
  }), [parsed, error])

  const collapseValue = useMemo<CollapseContextValue>(() => ({
    isCollapsed: (id) => collapsed.has(id),
    toggleCollapse,
    setAllCollapsed,
  }), [collapsed, toggleCollapse, setAllCollapsed])

  return (
    <NavContext.Provider value={navValue}>
      <CollapseContext.Provider value={collapseValue}>{children}</CollapseContext.Provider>
    </NavContext.Provider>
  )
}

export function useNav(): NavContextValue {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used within NavProvider')
  return ctx
}

export function useCollapse(): CollapseContextValue {
  const ctx = useContext(CollapseContext)
  if (!ctx) throw new Error('useCollapse must be used within NavProvider')
  return ctx
}
