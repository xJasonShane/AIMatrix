const memory = new Map<string, string>()

function safeGet(key: string): string | null {
  try {
    const v = localStorage.getItem(key)
    if (v !== null) return v
  } catch {
    /* fall through to memory */
  }
  // localStorage 不可用时读取内存回退值（如隐私模式下仅 setItem 被禁）
  return memory.get(key) ?? null
}

function safeSet(key: string, value: string): void {
  memory.set(key, value)
  try {
    localStorage.setItem(key, value)
  } catch {
    /* privacy mode: memory only */
  }
}

export const uiPrefs = {
  get: safeGet,
  set: safeSet,
  KEY_COLLAPSED: 'aimatrix:collapsed',
  KEY_RECENT: 'aimatrix:recent',
  KEY_FAVORITE: 'aimatrix:favorites',
}

function readJsonArray(key: string): string[] {
  try {
    const arr = JSON.parse(uiPrefs.get(key) ?? '[]')
    return Array.isArray(arr) ? (arr as string[]) : []
  } catch {
    return []
  }
}

const RECENT_EVENT = 'aimatrix:recent-changed'

/** 记录最近打开的链接：去重置顶，最多保留 max 条；派发事件通知订阅方即时刷新 */
export function pushRecentLink(id: string, max = 6): void {
  const next = [id, ...readJsonArray(uiPrefs.KEY_RECENT).filter((x) => x !== id)].slice(0, max)
  uiPrefs.set(uiPrefs.KEY_RECENT, JSON.stringify(next))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(RECENT_EVENT))
  }
}

/** 读取最近打开的链接 id 列表（最新在前） */
export function getRecentLinks(): string[] {
  return readJsonArray(uiPrefs.KEY_RECENT)
}

/** 订阅最近使用变化，返回取消订阅函数 */
export function subscribeRecentLinks(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(RECENT_EVENT, cb)
  return () => window.removeEventListener(RECENT_EVENT, cb)
}

const FAVORITE_EVENT = 'aimatrix:favorites-changed'

/** 切换收藏状态：未收藏则置顶加入，已收藏则移除；派发事件通知订阅方即时刷新 */
export function toggleFavorite(id: string): void {
  const prev = readJsonArray(uiPrefs.KEY_FAVORITE)
  const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]
  uiPrefs.set(uiPrefs.KEY_FAVORITE, JSON.stringify(next))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FAVORITE_EVENT))
  }
}

/** 读取收藏的链接 id 列表（最新收藏在前） */
export function getFavorites(): string[] {
  return readJsonArray(uiPrefs.KEY_FAVORITE)
}

/** 订阅收藏变化，返回取消订阅函数 */
export function subscribeFavorites(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(FAVORITE_EVENT, cb)
  return () => window.removeEventListener(FAVORITE_EVENT, cb)
}
