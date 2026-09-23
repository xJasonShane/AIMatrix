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
})
