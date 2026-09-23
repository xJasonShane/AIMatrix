import { it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { LazyMotion, domAnimation } from 'framer-motion'
import { NavProvider } from '../store/useNavStore'
import { NavPage } from './NavPage'
import raw from '../data/navigation.json'

const count = (raw as { categories: { links: unknown[] }[] }).categories
  .reduce((n, c) => n + c.links.length, 0)

// 位置探针：捕获 MemoryRouter 内当前 search，供 URL 同步断言（effect 中记录，避免渲染期副作用）
let currentSearch = ''
function SearchProbe() {
  const { search } = useLocation()
  useEffect(() => {
    currentSearch = search
  }, [search])
  return null
}

// m 组件的动画/手势特性需由 LazyMotion 提供（生产环境由 App 统一注入）
const renderNavPage = (initialPath = '/nav') => {
  currentSearch = ''
  return render(
    <LazyMotion features={domAnimation} strict>
      <MemoryRouter initialEntries={[initialPath]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <NavProvider>
          <NavPage />
          <SearchProbe />
        </NavProvider>
      </MemoryRouter>
    </LazyMotion>,
  )
}

it('focuses the search box on the / shortcut', () => {
  renderNavPage()
  fireEvent.keyDown(window, { key: '/' })
  expect(document.activeElement).toBe(screen.getByPlaceholderText('搜索工具名称或描述…'))
})

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

it('restores the search query from the URL (?q=) on load', () => {
  renderNavPage('/nav?q=chatgpt')
  const input = screen.getByPlaceholderText('搜索工具名称或描述…') as HTMLInputElement
  expect(input.value).toBe('chatgpt')
  // URL 预置查询直接作用于过滤：仅剩 1 张命中卡片
  expect(document.querySelectorAll('.link-card').length).toBe(1)
})

it('syncs typed queries into the URL and clears it with the query', () => {
  renderNavPage()
  const input = screen.getByPlaceholderText('搜索工具名称或描述…')
  fireEvent.change(input, { target: { value: 'midjourney' } })
  expect(currentSearch).toBe('?q=midjourney')
  // 清空按钮同步移除 URL 参数
  fireEvent.click(screen.getByRole('button', { name: '清除搜索' }))
  expect(currentSearch).toBe('')
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
