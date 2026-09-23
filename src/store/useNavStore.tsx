import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import raw from '../data/navigation.json'
import {
  validateNavData,
  categoryAngleRanges,
  type NavData,
  type AngleRange,
} from '../data/schema'
import { uiPrefs } from './uiPrefs'

interface NavContextValue {
  data: NavData
  error: string | null
  angles: AngleRange[]
  isCollapsed: (categoryId: string) => boolean
  toggleCollapse: (categoryId: string) => void
}

const NavContext = createContext<NavContextValue | null>(null)

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
      next.has(id) ? next.delete(id) : next.add(id)
      uiPrefs.set(uiPrefs.KEY_COLLAPSED, JSON.stringify([...next]))
      return next
    })
  }, [])

  const value = useMemo<NavContextValue>(() => ({
    data: parsed ?? { categories: [] },
    error,
    angles: parsed ? categoryAngleRanges(parsed.categories) : [],
    isCollapsed: (id) => collapsed.has(id),
    toggleCollapse,
  }), [parsed, error, collapsed, toggleCollapse])

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}

export function useNav(): NavContextValue {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used within NavProvider')
  return ctx
}
