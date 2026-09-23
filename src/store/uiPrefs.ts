const memory = new Map<string, string>()

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return memory.get(key) ?? null
  }
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
  KEY_FULLSCREEN: 'aimatrix:fullscreen',
}
