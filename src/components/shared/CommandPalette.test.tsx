import { it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, waitFor, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LazyMotion, domAnimation } from 'framer-motion'
import { NavProvider } from '../../store/useNavStore'
import { CommandPalette } from './CommandPalette'
import type { NavData } from '../../data/schema'
import raw from '../../../public/data/navigation.json'

// 默认使用真实数据；个别用例可整体替换（渲染时才读取该变量，规避 vi.mock 提升期 TDZ）
let mockData: unknown = raw

vi.mock('../../store/useNavStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../store/useNavStore')>()
  return {
    ...actual,
    useNav: () =>
      ({ data: mockData, error: null }) as unknown as ReturnType<
        typeof actual.useNav
      >,
  }
})

beforeEach(() => {
  mockData = raw
  localStorage.clear()
})

const renderPalette = (initialPath = '/nav') =>
  render(
    <LazyMotion features={domAnimation} strict>
      <MemoryRouter initialEntries={[initialPath]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <NavProvider initialData={raw as NavData}>
          <CommandPalette />
        </NavProvider>
      </MemoryRouter>
    </LazyMotion>,
  )

it('opens with Ctrl+K and closes on Escape', async () => {
  renderPalette()
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
  expect(screen.getByRole('dialog')).toBeTruthy()
  fireEvent.keyDown(window, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
})

it('filters actions by query and runs the selected view action on Enter', async () => {
  renderPalette()
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
  const input = screen.getByRole('combobox')
  fireEvent.change(input, { target: { value: '矩阵' } })
  const options = screen.getAllByRole('option')
  expect(options).toHaveLength(1)
  expect(options[0]).toHaveTextContent('矩阵视图')
  fireEvent.keyDown(input, { key: 'Enter' })
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
})

it('shows an empty state for unmatched queries', () => {
  renderPalette()
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
  const input = screen.getByRole('combobox')
  fireEvent.change(input, { target: { value: 'zzz 不存在' } })
  expect(screen.getByText(/没有匹配/)).toBeTruthy()
})

it('locks body scroll while open and restores on close', async () => {
  renderPalette()
  expect(document.body.style.overflow).toBe('')
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
  expect(document.body.style.overflow).toBe('hidden')
  fireEvent.keyDown(window, { key: 'Escape' })
  await waitFor(() => expect(document.body.style.overflow).toBe(''))
})

it('traps Tab focus within the panel in both directions', () => {
  renderPalette()
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
  const input = screen.getByRole('combobox')
  input.focus()
  // Tab / Shift+Tab 均被拦截（preventDefault → fireEvent 返回 false），焦点不会逃出面板
  expect(fireEvent.keyDown(input, { key: 'Tab' })).toBe(false)
  expect(fireEvent.keyDown(input, { key: 'Tab', shiftKey: true })).toBe(false)
})

it('runs link actions via window.open and records recent usage', () => {
  const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
  renderPalette()
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ChatGPT' } })
  fireEvent.click(screen.getByRole('option'))
  expect(openSpy).toHaveBeenCalledWith('https://chatgpt.com', '_blank', 'noopener,noreferrer')
  expect(localStorage.getItem('aimatrix:recent')).toContain('gpt')
  openSpy.mockRestore()
})

it('excludes links with invalid urls from results', () => {
  mockData = {
    categories: [
      {
        id: 'mock',
        name: '模拟分类',
        links: [
          { id: 'good', name: '好链接', url: 'https://good.example.com', description: '可用' },
          { id: 'bad', name: '坏链接', url: 'not-a-url', description: '不可用' },
        ],
      },
    ],
  }
  renderPalette()
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '链接' } })
  const options = screen.getAllByRole('option')
  expect(options).toHaveLength(1)
  expect(options[0]).toHaveTextContent('好链接')
})

const twoLinksData = {
  categories: [
    {
      id: 'mock',
      name: '模拟分类',
      links: [
        { id: 'a', name: '链接A', url: 'https://a.example.com', description: '' },
        { id: 'b', name: '链接B', url: 'https://b.example.com', description: '' },
      ],
    },
  ],
}

it('wraps arrow navigation past the last item back to the first', () => {
  mockData = twoLinksData // 2 链接 + 2 视图 = 4 个选项
  renderPalette()
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
  const input = screen.getByRole('combobox')
  // 首项高亮 → 3 次 ArrowDown 到末项 → 第 4 次回绕到首项
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  const options = screen.getAllByRole('option')
  expect(options[3]).toHaveAttribute('aria-selected', 'true')
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  expect(options[0]).toHaveAttribute('aria-selected', 'true')
})

it('wraps arrow navigation from the first item back to the last', () => {
  mockData = twoLinksData
  renderPalette()
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
  const input = screen.getByRole('combobox')
  // 首项高亮 → ArrowUp 回绕到末项
  fireEvent.keyDown(input, { key: 'ArrowUp' })
  const options = screen.getAllByRole('option')
  expect(options[options.length - 1]).toHaveAttribute('aria-selected', 'true')
})

it('resets the highlighted item to the first option when the query changes', () => {
  mockData = twoLinksData
  renderPalette()
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
  const input = screen.getByRole('combobox')
  // 先移动高亮到第 3 项，再输入新查询：高亮重置回首项（残留索引会越界）
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  fireEvent.change(input, { target: { value: '链接' } })
  const options = screen.getAllByRole('option')
  expect(options).toHaveLength(2)
  expect(options[0]).toHaveAttribute('aria-selected', 'true')
})

it('scrolls the highlighted option into view on active index change', () => {
  const spy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {})
  renderPalette()
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
  expect(spy).toHaveBeenCalledWith({ block: 'nearest' }) // 打开面板即高亮首项
  spy.mockClear()
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' })
  expect(spy).toHaveBeenCalledTimes(1)
  expect(spy).toHaveBeenCalledWith({ block: 'nearest' })
  spy.mockRestore()
})
