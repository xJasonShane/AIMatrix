import { it, expect, describe, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NavProvider } from '../../store/useNavStore'
import { CategorySection } from './CategorySection'
import type { NavCategory } from '../../data/schema'

const category: NavCategory = {
  id: 'chat',
  name: '对话助手',
  color: '#b4553f',
  links: [
    { id: 'gpt', name: 'ChatGPT', url: 'https://chatgpt.com', description: 'OpenAI 对话助手' },
    { id: 'claude', name: 'Claude', url: 'https://claude.ai', description: 'Anthropic 对话助手' },
  ],
}

const renderSection = (props: { forceOpen?: boolean } = {}) =>
  render(
    <MemoryRouter>
      <NavProvider>
        <CategorySection category={category} {...props} />
      </NavProvider>
    </MemoryRouter>,
  )

const headOf = () => screen.getByRole('button', { name: /对话助手/ })

beforeEach(() => localStorage.clear())

describe('CategorySection', () => {
  it('renders the header with name, link count and expanded state', () => {
    renderSection()
    expect(screen.getByRole('heading', { level: 2, name: '对话助手' })).toBeTruthy()
    expect(headOf()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('ChatGPT')).toBeTruthy()
    expect(screen.getByText('Claude')).toBeTruthy()
  })

  it('collapses on head click, unmounts the cards and persists to localStorage', async () => {
    renderSection()
    fireEvent.click(headOf())
    expect(headOf()).toHaveAttribute('aria-expanded', 'false')
    expect(localStorage.getItem('aimatrix:collapsed')).toContain('chat')
    // AnimatePresence 退场动画结束后卡片才卸载
    await waitFor(() => expect(screen.queryByText('ChatGPT')).toBeNull())
  })

  it('restores the collapsed state from localStorage on mount', () => {
    localStorage.setItem('aimatrix:collapsed', JSON.stringify(['chat']))
    renderSection()
    expect(headOf()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('ChatGPT')).toBeNull()
  })

  it('forceOpen renders links even when collapsed and ignores head clicks', () => {
    localStorage.setItem('aimatrix:collapsed', JSON.stringify(['chat']))
    renderSection({ forceOpen: true })
    fireEvent.click(headOf())
    // 搜索模式下强制展开：点击不切换折叠，也不改写存储
    expect(headOf()).toHaveAttribute('aria-expanded', 'true')
    expect(localStorage.getItem('aimatrix:collapsed')).toBe(JSON.stringify(['chat']))
    expect(screen.getByText('ChatGPT')).toBeTruthy()
  })
})
