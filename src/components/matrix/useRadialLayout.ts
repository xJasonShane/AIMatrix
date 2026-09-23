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
}

export interface RadialLayout {
  root: { x: number; y: number }
  categories: LayoutNode[]
  links: LayoutLink[]
  /** 分类环 / 叶环半径，供参考圆底纹使用 */
  radii: { cat: number; link: number }
}

export function computeLayout(data: NavData, width: number, height: number): RadialLayout {
  const cx = width / 2
  const cy = height / 2
  const maxR = Math.min(width, height) / 2
  const rCat = maxR * 0.36
  const rLink = maxR * 0.78

  const ranges = categoryAngleRanges(data.categories)
  const rangeById = new Map(ranges.map((r) => [r.categoryId, r]))
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
      links.push({
        id: link.id,
        name: link.name,
        x: cx + Math.cos(a) * rLink,
        y: cy + Math.sin(a) * rLink,
        angle: a,
        color,
        categoryId: cat.id,
        url: link.url,
        description: link.description,
        parent: { x: catX, y: catY },
      })
    })
  })

  return { root: { x: cx, y: cy }, categories, links, radii: { cat: rCat, link: rLink } }
}
