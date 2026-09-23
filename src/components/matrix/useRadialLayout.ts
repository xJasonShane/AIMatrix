import type { NavData } from '../../data/schema'
import { categoryAngleRanges } from '../../data/schema'

export interface LayoutNode {
  id: string
  name: string
  x: number
  y: number
  angle: number
  color: string
}

export interface RadialLayout {
  root: { x: number; y: number }
  categories: LayoutNode[]
  links: (LayoutNode & { categoryId: string; url: string })[]
}

export const DEFAULT_COLOR = '#00ff41'

export function computeLayout(data: NavData, width: number, height: number): RadialLayout {
  const cx = width / 2
  const cy = height / 2
  const maxR = Math.min(width, height) / 2
  const rCat = maxR * 0.36
  const rLink = maxR * 0.78

  const ranges = categoryAngleRanges(data.categories)
  const categories: LayoutNode[] = []
  const links: (LayoutNode & { categoryId: string; url: string })[] = []

  data.categories.forEach((cat) => {
    const range = ranges.find((r) => r.categoryId === cat.id)!
    const mid = (range.start + range.end) / 2
    const color = cat.color ?? DEFAULT_COLOR
    categories.push({
      id: cat.id,
      name: cat.name,
      x: cx + Math.cos(mid) * rCat,
      y: cy + Math.sin(mid) * rCat,
      angle: mid,
      color,
    })
    cat.links.forEach((link) => {
      const lr = range.linkRanges.find((l) => l.linkId === link.id)
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
      })
    })
  })

  return { root: { x: cx, y: cy }, categories, links }
}
