import { describe, it, expect } from 'vitest'
import { validateNavData, categoryAngleRanges } from './schema'
import raw from './navigation.json'

const good = {
  categories: [
    { id: 'chat', name: '对话助手', color: '#00ff41', links: [{ id: 'gpt', name: 'ChatGPT', url: 'https://chat.openai.com', description: 'OpenAI' }] },
    { id: 'art', name: '绘画生成', links: [{ id: 'mj', name: 'Midjourney', url: 'https://midjourney.com', description: '' }] },
  ],
}

describe('validateNavData', () => {
  it('accepts valid data', () => {
    expect(() => validateNavData(good)).not.toThrow()
  })

  it('throws with a field path when url is missing', () => {
    const bad = { categories: [{ id: 'c', name: 'C', links: [{ id: 'l', name: 'L', description: '' }] }] }
    expect(() => validateNavData(bad as never)).toThrow(/categories\[0\]\.links\[0\]\.url/)
  })

  it('throws on duplicate ids', () => {
    const dup = { categories: [{ id: 'c', name: 'C', links: [{ id: 'x', name: 'A', url: 'https://a.com', description: '' }, { id: 'x', name: 'B', url: 'https://b.com', description: '' }] }] }
    expect(() => validateNavData(dup as never)).toThrow(/duplicate id/)
  })
})

describe('categoryAngleRanges', () => {
  it('splits a full circle evenly by category link count', () => {
    const ranges = categoryAngleRanges(good.categories)
    expect(ranges).toHaveLength(2)
    // total must be 2π
    const total = ranges[ranges.length - 1].end - ranges[0].start
    expect(total).toBeCloseTo(Math.PI * 2, 5)
    // no overlap / gaps
    expect(ranges[1].start).toBeCloseTo(ranges[0].end, 5)
  })

  it('handles a single category with a single link', () => {
    const one = { categories: [{ id: 'c', name: 'C', links: [{ id: 'l', name: 'L', url: 'https://a.com', description: '' }] }] }
    const ranges = categoryAngleRanges(one.categories)
    expect(ranges[0].end - ranges[0].start).toBeCloseTo(Math.PI * 2, 5)
  })
})

it('real navigation.json is valid', () => {
  expect(() => validateNavData(raw)).not.toThrow()
})
