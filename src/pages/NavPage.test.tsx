import { it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LazyMotion, domAnimation } from 'framer-motion'
import { NavProvider } from '../store/useNavStore'
import { NavPage } from './NavPage'
import raw from '../data/navigation.json'

const count = (raw as { categories: { links: unknown[] }[] }).categories
  .reduce((n, c) => n + c.links.length, 0)

// m 组件的动画/手势特性需由 LazyMotion 提供（生产环境由 App 统一注入）
const renderNavPage = () =>
  render(
    <LazyMotion features={domAnimation} strict>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <NavProvider>
          <NavPage />
        </NavProvider>
      </MemoryRouter>
    </LazyMotion>,
  )

it('renders one card per link', () => {
  renderNavPage()
  expect(document.querySelectorAll('.link-card').length).toBe(count)
})

it('opens links in a new tab', () => {
  renderNavPage()
  const chatgpt = screen.getByRole('link', { name: /ChatGPT/ })
  expect(chatgpt).toHaveAttribute('target', '_blank')
  expect(chatgpt).toHaveAttribute('rel', 'noreferrer')
})

it('filters cards by search query and shows an empty state', () => {
  renderNavPage()
  const input = screen.getByPlaceholderText('搜索工具名称或描述…')
  fireEvent.change(input, { target: { value: 'chatgpt' } })
  expect(document.querySelectorAll('.link-card').length).toBe(1)
  fireEvent.change(input, { target: { value: 'zzz 不存在' } })
  expect(document.querySelectorAll('.link-card').length).toBe(0)
  expect(screen.getByText(/没有匹配/)).toBeTruthy()
})

it('shows the recent section immediately after clicking a link', () => {
  renderNavPage()
  expect(screen.queryByText('最近使用')).toBeNull()
  const chatgpt = screen.getByRole('link', { name: /ChatGPT/ })
  fireEvent.click(chatgpt)
  // 无需重新进入页面，点击后"最近使用"立即出现
  expect(screen.getByText('最近使用')).toBeTruthy()
})

it('announces the matched count in a live region while searching', () => {
  renderNavPage()
  const input = screen.getByPlaceholderText('搜索工具名称或描述…')
  fireEvent.change(input, { target: { value: 'chatgpt' } })
  expect(screen.getByText('找到 1 个匹配工具')).toBeTruthy()
  fireEvent.change(input, { target: { value: 'zzz 不存在' } })
  expect(screen.getByText('没有找到匹配的工具')).toBeTruthy()
})

it('exposes the recent section as a named landmark', () => {
  // 预置最近使用数据（localStorage 优先于 uiPrefs 内存回退），复现从存储恢复链接的场景
  localStorage.setItem('aimatrix:recent', JSON.stringify(['gpt']))
  renderNavPage()
  expect(screen.getByRole('region', { name: '最近使用' })).toBeTruthy()
})
