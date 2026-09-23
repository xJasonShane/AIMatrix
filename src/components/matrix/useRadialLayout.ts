import type { NavData } from '../../data/schema'
import { categoryAngleRanges, DEFAULT_COLOR } from '../../data/schema'

export interface LayoutNode {
  id: string
  name: string
  x: number
  y: number
  angle: number
  color: string
}

/** 叶节点：预计算父分类坐标，供连线渲染 O(1) 获取（替代渲染期按 id 反查分类） */
export interface LayoutLink extends LayoutNode {
  categoryId: string
  url: string
  description: string
  /** 父分类节点坐标 */
  parent: { x: number; y: number }
  /** 所在叶环序号（0 = 基准环；多环时按角度交错分布） */
  ring: number
}

export interface RadialLayout {
  root: { x: number; y: number }
  categories: LayoutNode[]
  links: LayoutLink[]
  /** 分类环 / 叶环基准半径（多环时叶节点向外扩展 ring * RING_GAP），供参考圆底纹使用 */
  radii: { cat: number; link: number }
  /** 叶节点实际使用的环数（1 = 经典单环布局） */
  rings: number
}

/** 相邻叶节点的最小期望弧距（px）：低于该值标签开始重叠，触发加环 */
export const MIN_ARC = 24
/** 相邻叶环的半径间隔（px） */
export const RING_GAP = 26
/** 环数上限：超过后接受局部密集（画布外推有边界） */
export const MAX_RINGS = 3

/**
 * 计算径向树布局。叶环按需多环：当某分类的相邻叶节点弧距低于 MIN_ARC 时
 * （弧距 = 角度间距 × 基准半径），叶节点按角度交错分布到多个同心环上，
 * 单环内实际间距扩大 rings 倍；基准半径同步内收，保证最外环不出画布。
 * 数据规模小（默认场景）时 rings = 1，布局与经典单环完全一致。
 */
export function computeLayout(data: NavData, width: number, height: number): RadialLayout {
  const cx = width / 2
  const cy = height / 2
  const maxR = Math.min(width, height) / 2
  const rCat = maxR * 0.36
  let rLink = maxR * 0.78

  const ranges = categoryAngleRanges(data.categories)
  const rangeById = new Map(ranges.map((r) => [r.categoryId, r]))
  const totalLinks = Math.max(
    1,
    data.categories.reduce((n, c) => n + c.links.length, 0),
  )

  // 环数判定：各分类所需环数取最大值（rings ≥ MIN_ARC / 弧距）
  let rings = 1
  for (const cat of data.categories) {
    const span = ((cat.links.length || 1) / totalLinks) * Math.PI * 2
    const per = span / Math.max(1, cat.links.length)
    const needed = Math.ceil(MIN_ARC / Math.max(per * rLink, Number.EPSILON))
    rings = Math.max(rings, Math.min(MAX_RINGS, needed))
  }
  // 多环时基准半径内收：最外环半径 ≤ 95% maxR，不越过画布
  if (rings > 1) {
    rLink = Math.min(rLink, maxR * 0.95 - (rings - 1) * RING_GAP)
  }

  const categories: LayoutNode[] = []
  const links: LayoutLink[] = []

  data.categories.forEach((cat) => {
    const range = rangeById.get(cat.id)!
    const mid = (range.start + range.end) / 2
    const color = cat.color ?? DEFAULT_COLOR
    const catX = cx + Math.cos(mid) * rCat
    const catY = cy + Math.sin(mid) * rCat
    categories.push({
      id: cat.id,
      name: cat.name,
      x: catX,
      y: catY,
      angle: mid,
      color,
    })
    cat.links.forEach((link, j) => {
      // linkRanges 与 links 同序（categoryAngleRanges 同源生成），索引访问替代按 id 查找
      const lr = range.linkRanges[j]
      const a = lr ? lr.mid : mid
      // 交错分布：相邻角度的叶节点交替落入内外环，单环内间距扩大 rings 倍
      const ring = rings > 1 ? j % rings : 0
      const r = rLink + ring * RING_GAP
      links.push({
        id: link.id,
        name: link.name,
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r,
        angle: a,
        color,
        categoryId: cat.id,
        url: link.url,
        description: link.description,
        parent: { x: catX, y: catY },
        ring,
      })
    })
  })

  return { root: { x: cx, y: cy }, categories, links, radii: { cat: rCat, link: rLink }, rings }
}
