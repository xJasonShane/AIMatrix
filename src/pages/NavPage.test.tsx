import { it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NavProvider } from '../store/useNavStore'
import { NavPage } from './NavPage'
import raw from '../data/navigation.json'

const count = (raw as { categories: { links: unknown[] }[] }).categories
  .reduce((n, c) => n + c.links.length, 0)

it('renders one card per link', () => {
  render(
    <MemoryRouter><NavProvider><NavPage /></NavProvider></MemoryRouter>,
  )
  expect(document.querySelectorAll('.link-card').length).toBe(count)
})

it('opens links in a new tab', () => {
  render(
    <MemoryRouter><NavProvider><NavPage /></NavProvider></MemoryRouter>,
  )
  const chatgpt = screen.getByRole('link', { name: /ChatGPT/ })
  expect(chatgpt).toHaveAttribute('target', '_blank')
  expect(chatgpt).toHaveAttribute('rel', 'noreferrer')
})

it('filters cards by search query and shows an empty state', () => {
  render(
    <MemoryRouter><NavProvider><NavPage /></NavProvider></MemoryRouter>,
  )
  const input = screen.getByPlaceholderText('搜索工具名称或描述…')
  fireEvent.change(input, { target: { value: 'chatgpt' } })
  expect(document.querySelectorAll('.link-card').length).toBe(1)
  fireEvent.change(input, { target: { value: 'zzz 不存在' } })
  expect(document.querySelectorAll('.link-card').length).toBe(0)
  expect(screen.getByText(/没有匹配/)).toBeTruthy()
})

it('shows the recent section immediately after clicking a link', () => {
  render(
    <MemoryRouter><NavProvider><NavPage /></NavProvider></MemoryRouter>,
  )
  expect(screen.queryByText('最近使用')).toBeNull()
  const chatgpt = screen.getByRole('link', { name: /ChatGPT/ })
  fireEvent.click(chatgpt)
  // 无需重新进入页面，点击后"最近使用"立即出现
  expect(screen.getByText('最近使用')).toBeTruthy()
})
