import { it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, waitFor, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NavProvider } from '../../store/useNavStore'
import { CommandPalette } from './CommandPalette'
import raw from '../../data/navigation.json'

// 默认使用真实数据；个别用例可整体替换（渲染时才读取该变量，规避 vi.mock 提升期 TDZ）
let mockData: unknown = raw

vi.mock('../../store/useNavStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../store/useNavStore')>()
  return {
    ...actual,
    useNav: () =>
      ({ data: mockData, error: null, angles: [] }) as unknown as ReturnType<
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
    <MemoryRouter initialEntries={[initialPath]}>
      <NavProvider>
        <CommandPalette />
      </NavProvider>
    </MemoryRouter>,
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
