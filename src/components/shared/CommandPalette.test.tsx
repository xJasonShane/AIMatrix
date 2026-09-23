import { it, expect } from 'vitest'
import { render, fireEvent, waitFor, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NavProvider } from '../../store/useNavStore'
import { CommandPalette } from './CommandPalette'

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
