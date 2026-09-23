import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  validateNavData,
  type NavData,
} from '../data/schema'
import { uiPrefs } from './uiPrefs'

interface NavContextValue {
  data: NavData
  error: string | null
  /** 运行时数据加载中（首帧为 true；注入 initialData 时恒为 false） */
  loading: boolean
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

const EMPTY_DATA: NavData = { categories: [] }

/**
 * 运行时加载数据：fetch public/data/navigation.json（不打包进 bundle），
 * 替换该文件即可更新站点内容，无需重新构建。cache:'no-cache' 保证替换后尽快生效。
 * 校验失败与请求失败统一进入 error 分支（DataError 页）。
 */
function useNavData(initialData?: NavData): NavContextValue {
  const [state, setState] = useState<{ data: NavData; error: string | null }>(() =>
    initialData ? { data: initialData, error: null } : { data: EMPTY_DATA, error: null },
  )
  const [loading, setLoading] = useState(!initialData)

  useEffect(() => {
    if (initialData) return
    let cancelled = false
    fetch('./data/navigation.json', { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((raw: unknown) => {
        if (!cancelled) setState({ data: validateNavData(raw), error: null })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setState({
          data: EMPTY_DATA,
          error: e instanceof Error ? e.message : String(e),
        })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [initialData])

  return useMemo(() => ({ data: state.data, error: state.error, loading }), [state, loading])
}

export function NavProvider({
  children,
  initialData,
}: {
  children: React.ReactNode
  /** 测试注入：跳过 fetch 直接使用给定数据 */
  initialData?: NavData
}) {
  const { data, error, loading } = useNavData(initialData)

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
      const next = collapsed ? new Set(data.categories.map((c) => c.id)) : new Set<string>()
      uiPrefs.set(uiPrefs.KEY_COLLAPSED, JSON.stringify([...next]))
      setCollapsed(next)
    },
    [data],
  )

  const collapseValue = useMemo<CollapseContextValue>(() => ({
    isCollapsed: (id) => collapsed.has(id),
    toggleCollapse,
    setAllCollapsed,
  }), [collapsed, toggleCollapse, setAllCollapsed])

  return (
    <NavContext.Provider value={{ data, error, loading }}>
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
