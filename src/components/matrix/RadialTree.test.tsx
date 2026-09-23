import { it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { RadialTree } from './RadialTree'
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

const renderTree = () => render(<RadialTree data={data} width={800} height={600} />)

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
