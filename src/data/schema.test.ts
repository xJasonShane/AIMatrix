import { describe, it, expect } from 'vitest'
import { validateNavData, categoryAngleRanges, isValidUrl, matchesQuery } from './schema'
import raw from '../../public/data/navigation.json'

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

  it('keeps invalid url instead of throwing (rendering layer shows disabled state)', () => {
    const bad = {
      categories: [{ id: 'c', name: 'C', links: [{ id: 'l', name: 'L', url: 'ftp://a.com', description: '' }] }],
    }
    expect(() => validateNavData(bad)).not.toThrow()
    expect(validateNavData(bad).categories[0].links[0].url).toBe('ftp://a.com')
  })

  it('throws on duplicate ids', () => {
    const dup = { categories: [{ id: 'c', name: 'C', links: [{ id: 'x', name: 'A', url: 'https://a.com', description: '' }, { id: 'x', name: 'B', url: 'https://b.com', description: '' }] }] }
    expect(() => validateNavData(dup as never)).toThrow(/duplicate id/)
  })
})

describe('color normalization', () => {
  const cats = (colors: (string | number | undefined)[]) => ({
    categories: colors.map((color, i) => ({
      id: `c${i}`,
      name: `C${i}`,
      ...(color === undefined ? {} : { color }),
      links: [{ id: `l${i}`, name: 'L', url: 'https://a.com', description: '' }],
    })),
  })

  it('keeps valid hex colors (3/4/6/8 digits) and degrades invalid ones to the default', () => {
    const result = validateNavData(cats(['#abc', 'blah', '#12345678', undefined, 42]))
    expect(result.categories[0].color).toBe('#abc')
    // 非十六进制字符串：不抛错，降级为 undefined（展示层回落 DEFAULT_COLOR）
    expect(result.categories[1].color).toBeUndefined()
    expect(result.categories[2].color).toBe('#12345678')
    expect(result.categories[3].color).toBeUndefined()
    expect(result.categories[4].color).toBeUndefined()
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

describe('isValidUrl', () => {
  it('accepts http/https urls only', () => {
    expect(isValidUrl('https://a.com')).toBe(true)
    expect(isValidUrl('http://a.com')).toBe(true)
    expect(isValidUrl('ftp://a.com')).toBe(false)
    expect(isValidUrl('not a url')).toBe(false)
  })

  it('requires a parseable url with a host', () => {
    // 旧前缀正则会放行 "https://"（无主机）等不可解析形态，现统一由 new URL 兜底
    expect(isValidUrl('https://')).toBe(false)
    expect(isValidUrl('https://in valid.com')).toBe(false)
    expect(isValidUrl('javascript:alert(1)')).toBe(false)
    expect(isValidUrl('//a.com')).toBe(false)
  })

  it('accepts urls with paths, queries and fragments', () => {
    expect(isValidUrl('https://a.com/path?q=1#hash')).toBe(true)
    // 协议大小写不敏感（URL 解析会归一化 scheme）
    expect(isValidUrl('HTTPS://A.COM')).toBe(true)
  })
})

describe('matchesQuery', () => {
  it('matches when any field contains the query (case-insensitive)', () => {
    expect(matchesQuery('gpt', 'ChatGPT', 'OpenAI 对话')).toBe(true)
    expect(matchesQuery('openai', 'ChatGPT', 'OpenAI 对话')).toBe(true)
    expect(matchesQuery('chatgpt', 'ChatGPT', 'OpenAI 对话')).toBe(true)
    expect(matchesQuery('不存在', 'ChatGPT', 'OpenAI 对话')).toBe(false)
  })

  it('treats empty query as always matching', () => {
    expect(matchesQuery('', 'anything')).toBe(true)
  })

  it('is case-insensitive on both sides', () => {
    // 调用方约定传入 trim + toLowerCase 后的 q；字段侧由函数内统一 toLowerCase
    expect(matchesQuery('midjourney', 'Midjourney')).toBe(true)
  })
})

it('real navigation.json is valid', () => {
  expect(() => validateNavData(raw)).not.toThrow()
})
