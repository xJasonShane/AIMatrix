export interface NavLink {
  id: string
  name: string
  url: string
  description: string
}

export interface NavCategory {
  id: string
  name: string
  color?: string
  links: NavLink[]
}

export interface NavData {
  categories: NavCategory[]
}

/** 分类未指定 color 时的默认色（全站唯一来源） */
export const DEFAULT_COLOR = '#7a8a55'

/** 仅接受 http/https 协议且 URL 可被解析；非法 URL 由展示层渲染为禁用态而非抛错 */
export function isValidUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

function req(obj: Record<string, unknown>, key: string, path: string): string {
  const v = obj[key]
  if (typeof v !== 'string' || v.trim() === '') {
    throw new Error(`${path}.${key} 缺失或不是非空字符串`)
  }
  return v
}

/** Throws a field-path error when data is malformed. */
export function validateNavData(raw: unknown): NavData {
  if (!isRecord(raw) || !Array.isArray(raw.categories)) {
    throw new Error('navigation.json 根字段 categories 必须是数组')
  }
  const seen = new Set<string>()
  const mark = (id: string, path: string) => {
    if (seen.has(id)) throw new Error(`${path} duplicate id "${id}"`)
    seen.add(id)
  }

  const categories: NavCategory[] = raw.categories.map((c, i) => {
    const cPath = `categories[${i}]`
    if (!isRecord(c)) throw new Error(`${cPath} 必须是对象`)
    if (!Array.isArray(c.links)) throw new Error(`${cPath}.links 必须是数组`)
    const id = req(c, 'id', cPath)
    mark(id, cPath)
    const links: NavLink[] = c.links.map((l, j) => {
      const lPath = `${cPath}.links[${j}]`
      if (!isRecord(l)) throw new Error(`${lPath} 必须是对象`)
      const lid = req(l, 'id', lPath)
      mark(lid, lPath)
      const url = req(l, 'url', lPath)
      // 非法 URL 不在此处抛错：按设计规范照常渲染，由展示层（LinkCard / 矩阵节点）显示禁用态
      return {
        id: lid,
        name: req(l, 'name', lPath),
        url,
        description: typeof l.description === 'string' ? l.description : '',
      }
    })
    return {
      id,
      name: req(c, 'name', cPath),
      color: typeof c.color === 'string' ? c.color : undefined,
      links,
    }
  })

  return { categories }
}

export interface AngleRange {
  categoryId: string
  start: number
  end: number
  /** same but subdivided per link */
  linkRanges: { linkId: string; mid: number }[]
}

/** Divide the full circle by category, weighted by link count; subdivide per link. */
export function categoryAngleRanges(categories: NavCategory[]): AngleRange[] {
  const totalLinks = Math.max(
    1,
    categories.reduce((n, c) => n + c.links.length, 0),
  )
  let cursor = -Math.PI / 2 // start at top
  return categories.map((c) => {
    const span = ((c.links.length || 1) / totalLinks) * Math.PI * 2
    const start = cursor
    const end = cursor + span
    cursor = end
    const per = span / Math.max(1, c.links.length)
    let sub = start
    const linkRanges = c.links.map((l) => {
      const mid = sub + per / 2
      sub += per
      return { linkId: l.id, mid }
    })
    return { categoryId: c.id, start, end, linkRanges }
  })
}
