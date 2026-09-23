import { it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LazyMotion, domAnimation } from 'framer-motion'
import { RadialTree, zoomTranslate, clampScale, MIN_SCALE, MAX_SCALE } from './RadialTree'
import type { NavData } from '../../data/schema'

const data: NavData = {
  categories: [
    {
      id: 'c1',
      name: '分类一',
      color: '#00ff41',
      links: [
        { id: 'l1', name: 'L1', url: 'https://a.com', description: 'd1' },
        { id: 'bad', name: 'Bad', url: 'ftp://x.com', description: '' },
      ],
    },
    {
      id: 'c2',
      name: '分类二',
      links: [{ id: 'l2', name: 'L2', url: 'https://b.com', description: 'd2' }],
    },
  ],
}

// m 组件的动画/手势特性需由 LazyMotion 提供（生产环境由 App 统一注入）；
// RadialTree 内部使用 useNavigate（分类节点"导航查看"联动），测试中需提供 Router 上下文
const renderTree = () =>
  render(
    <LazyMotion features={domAnimation} strict>
      <MemoryRouter>
        <RadialTree data={data} width={800} height={600} />
      </MemoryRouter>
    </LazyMotion>,
  )

it('renders an anchor for valid links and a disabled node for invalid ones', () => {
  const { container } = renderTree()
  const anchors = container.querySelectorAll('a.tree-link-node')
  expect(anchors).toHaveLength(2)
  expect(anchors[0]).toHaveAttribute('href', 'https://a.com')
  expect(anchors[0]).toHaveAttribute('target', '_blank')
  const disabled = container.querySelectorAll('.tree-link-node.disabled')
  expect(disabled).toHaveLength(1)
  expect(disabled[0].tagName).not.toBe('A')
})

it('pins a branch when its category node is clicked, unpins on second click', () => {
  const { getAllByRole } = renderTree()
  const catNodes = getAllByRole('button')
  expect(catNodes).toHaveLength(2)
  expect(catNodes[0]).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(catNodes[0])
  expect(catNodes[0]).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(catNodes[0])
  expect(catNodes[0]).toHaveAttribute('aria-pressed', 'false')
})

/** 触发带 pointerType 的 pointerdown（不依赖环境 PointerEvent 实现） */
const fireTouchDown = (el: Element) => {
  const e = new MouseEvent('pointerdown', { bubbles: true, cancelable: true })
  Object.defineProperty(e, 'pointerType', { value: 'touch' })
  el.dispatchEvent(e)
}

/** 收集当前渲染的叶节点静态标签（无 hover 时 popover 不渲染，仅静态标签） */
const linkLabels = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('.link-label')).map((el) => el.textContent)

it('first touch tap shows the popover, second tap opens the link', () => {
  const { container } = renderTree()
  const anchor = container.querySelector('a.tree-link-node') as HTMLAnchorElement
  fireTouchDown(anchor)
  // 首次触屏 tap：阻止默认跳转，仅显示浮层
  expect(fireEvent.click(anchor)).toBe(false)
  fireTouchDown(anchor)
  // 浮层已显示：再次 tap 放行打开链接
  expect(fireEvent.click(anchor)).toBe(true)
})

describe('RadialTree query filtering', () => {
  const renderTreeWithQuery = (query: string) =>
    render(
      <LazyMotion features={domAnimation} strict>
        <MemoryRouter>
          <RadialTree data={data} width={800} height={600} query={query} />
        </MemoryRouter>
      </LazyMotion>,
    )

  it('shows labels only for matched links and keeps the tree structure', () => {
    const { container } = renderTreeWithQuery('L1')
    expect(linkLabels(container)).toContain('L1')
    // 未命中叶节点的静态标签不渲染（节点与连线压暗但仍在 DOM 中）
    expect(linkLabels(container)).not.toContain('L2')
    expect(container.querySelectorAll('a.tree-link-node')).toHaveLength(2)
  })

  it('renders all labels when the query is empty or whitespace', () => {
    const { container } = renderTreeWithQuery('  ')
    expect(linkLabels(container)).toContain('L1')
    expect(linkLabels(container)).toContain('L2')
  })
})

describe('view zoom helpers', () => {
  it('keeps the content point under the pointer fixed while zooming', () => {
    // 指针下的内容点 c = (p - t) / s 在缩放前后映射到同一视口位置 p
    const p = { x: 2, y: 3 }
    const t = zoomTranslate(p.x, p.y, 1, 2, 0, 0)
    const c = { x: (p.x - 0) / 1, y: (p.y - 0) / 1 }
    expect(c.x * 2 + t.x).toBeCloseTo(p.x)
    expect(c.y * 2 + t.y).toBeCloseTo(p.y)
  })

  it('composes with an existing pan offset', () => {
    // 视口 (100,100)、旧视图 scale=2 translate=(10,-20)：指针下内容点 c=(45,60)
    const t = zoomTranslate(100, 100, 2, 4, 10, -20)
    expect(t.x).toBeCloseTo(-80) // 45*4 + t.x = 100
    expect(t.y).toBeCloseTo(-140) // 60*4 + t.y = 100
  })

  it('clamps scale into the configured bounds', () => {
    expect(clampScale(0.1)).toBe(MIN_SCALE)
    expect(clampScale(99)).toBe(MAX_SCALE)
    expect(clampScale(1.5)).toBe(1.5)
  })
})
