export interface NavLink {
  id: string
  name: string
  url: string
  description: string
  /** 可选检索关键词：不直接展示，参与全站搜索（名称/描述/URL 之外的补充召回） */
  tags?: string[]
  /** 可选图标：https(s) URL 或站内相对路径（如 ./icons/xxx.svg）；非法值降级为首字母色块 */
  icon?: string
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
export const DEFAULT_COLOR = '#7d9bb8'

/** 仅接受 http/https 协议且 URL 可被解析；非法 URL 由展示层渲染为禁用态而非抛错 */
export function isValidUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * 全站唯一搜索匹配规则：任一字段包含查询子串即命中（不区分大小写）。
 * q 须为 trim + toLowerCase 后的查询词；空查询视为全部命中。
 * 导航卡片过滤 / 矩阵节点高亮 / 命中计数 / 命令面板过滤共用此函数，规则变更只改此处。
 */
export function matchesQuery(q: string, ...fields: string[]): boolean {
  if (!q) return true
  return fields.some((f) => f.toLowerCase().includes(q))
}

/** 合法十六进制颜色：#rgb / #rgba / #rrggbb / #rrggbbaa；非法值降级为 undefined，由默认色兜底 */
const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

/** 与非法 URL 同策略：不抛错，交由展示层回落 DEFAULT_COLOR，保证视觉始终有效 */
function optionalColor(v: unknown): string | undefined {
  return typeof v === 'string' && HEX_COLOR.test(v) ? v : undefined
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

/** 合法图标地址：http(s) 绝对地址或 ./ / 相对路径（拒绝 javascript: / data: 等注入面） */
function optionalIcon(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  if (s === '') return undefined
  try {
    const { protocol } = new URL(s)
    return protocol === 'https:' || protocol === 'http:' ? s : undefined
  } catch {
    // 相对路径（./icons/x.svg、icons/x.svg）：交由 <img> 加载，onError 降级为首字母
    return s
  }
}

/** 可选 tags：仅保留非空字符串，超出上限截断（防御异常大的数据） */
const MAX_TAGS = 8
function optionalTags(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined
  const tags = v.filter((t): t is string => typeof t === 'string' && t.trim() !== '').slice(0, MAX_TAGS)
  return tags.length > 0 ? tags : undefined
}

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
      const tags = optionalTags(l.tags)
      const icon = optionalIcon(l.icon)
      return {
        id: lid,
        name: req(l, 'name', lPath),
        url,
        description: typeof l.description === 'string' ? l.description : '',
        // 可选字段同策略：非法值降级为 undefined（不写入结果），不抛错
        ...(tags ? { tags } : {}),
        ...(icon ? { icon } : {}),
      }
    })
    return {
      id,
      name: req(c, 'name', cPath),
      color: optionalColor(c.color),
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
