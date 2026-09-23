import { describe, it, expect } from 'vitest'
import { computeLayout } from './useRadialLayout'
import type { NavData } from '../../data/schema'

const data: NavData = {
  categories: [
    { id: 'a', name: 'A', links: [{ id: 'a1', name: 'A1', url: 'https://a.com', description: '' }, { id: 'a2', name: 'A2', url: 'https://a2.com', description: '' }] },
    { id: 'b', name: 'B', links: [{ id: 'b1', name: 'B1', url: 'https://b.com', description: '' }] },
  ],
}

describe('computeLayout', () => {
  it('places all nodes inside the viewport box', () => {
    const layout = computeLayout(data, 1000, 700)
    expect(layout.categories).toHaveLength(2)
    expect(layout.links).toHaveLength(3)
    for (const n of [...layout.categories, ...layout.links]) {
      expect(n.x).toBeGreaterThanOrEqual(0)
      expect(n.x).toBeLessThanOrEqual(1000)
      expect(n.y).toBeGreaterThanOrEqual(0)
      expect(n.y).toBeLessThanOrEqual(700)
    }
  })

  it('keeps links outside their category radius', () => {
    const layout = computeLayout(data, 1000, 700)
    const catA = layout.categories.find((c) => c.id === 'a')!
    const linkA = layout.links.find((l) => l.id === 'a1')!
    const d = Math.hypot(linkA.x - catA.x, linkA.y - catA.y)
    expect(d).toBeGreaterThan(0)
  })

  it('does not overlap category nodes', () => {
    const layout = computeLayout(data, 800, 600)
    const [c1, c2] = layout.categories
    expect(Math.hypot(c1.x - c2.x, c1.y - c2.y)).toBeGreaterThan(40)
  })

  it('precomputes the parent category position on every link', () => {
    const layout = computeLayout(data, 1000, 700)
    expect(layout.links).toHaveLength(3)
    for (const l of layout.links) {
      const parent = layout.categories.find((c) => c.id === l.categoryId)!
      expect(l.parent).toEqual({ x: parent.x, y: parent.y })
    }
  })

  it('stays on the classic single ring for small data', () => {
    const layout = computeLayout(data, 1000, 700)
    expect(layout.rings).toBe(1)
    for (const l of layout.links) expect(l.ring).toBe(0)
  })
})

describe('computeLayout multi-ring (crowded leaf ring)', () => {
  // 70 个叶节点均分整圆：相邻弧距 ≈ 21px < MIN_ARC(24px)，应触发两环交错
  const crowded: NavData = {
    categories: [
      {
        id: 'big',
        name: 'Big',
        links: Array.from({ length: 70 }, (_, i) => ({
          id: `l${i}`,
          name: `L${i}`,
          url: 'https://x.com',
          description: '',
        })),
      },
    ],
  }

  it('spreads crowded leaves across multiple interleaved rings', () => {
    const layout = computeLayout(crowded, 800, 600)
    expect(layout.rings).toBe(2)
    // 相邻角度的叶节点交错落入不同环（j % rings）
    expect(layout.links[0].ring).toBe(0)
    expect(layout.links[1].ring).toBe(1)
    // 实际使用的环数与声明一致
    expect(new Set(layout.links.map((l) => l.ring)).size).toBe(layout.rings)
  })

  it('keeps every leaf inside the viewport on outer rings', () => {
    const layout = computeLayout(crowded, 800, 600)
    for (const l of layout.links) {
      expect(l.x).toBeGreaterThanOrEqual(0)
      expect(l.x).toBeLessThanOrEqual(800)
      expect(l.y).toBeGreaterThanOrEqual(0)
      expect(l.y).toBeLessThanOrEqual(600)
    }
  })

  it('enlarges the effective arc gap on each ring', () => {
    const layout = computeLayout(crowded, 800, 600)
    // 同环相邻叶节点的弧距应达到 MIN_ARC（交错后扩大 rings 倍）
    const ring0 = layout.links.filter((l) => l.ring === 0)
    for (let i = 0; i < ring0.length - 1; i++) {
      const arc = Math.hypot(ring0[i].x - ring0[i + 1].x, ring0[i].y - ring0[i + 1].y)
      expect(arc).toBeGreaterThan(24)
    }
  })
})
