import { it, expect, describe, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LinkCard } from './LinkCard'
import type { NavLink } from '../../data/schema'

beforeEach(() => localStorage.clear())

const baseLink: NavLink = {
  id: 'gpt',
  name: 'ChatGPT',
  url: 'https://chatgpt.com',
  description: 'OpenAI 对话助手',
}

const renderCard = (link: NavLink) =>
  render(<LinkCard link={link} color="#b4553f" index={0} />)

describe('LinkCard', () => {
  it('renders name, description and the hostname without www for a valid url', () => {
    renderCard({ ...baseLink, url: 'https://www.chatgpt.com' })
    expect(screen.getByText('ChatGPT')).toBeTruthy()
    expect(screen.getByText('OpenAI 对话助手')).toBeTruthy()
    expect(screen.getByText('chatgpt.com')).toBeTruthy()
  })

  it('opens in a new tab with noreferrer and records recent usage on click', () => {
    renderCard(baseLink)
    const card = screen.getByRole('link', { name: /ChatGPT/ })
    expect(card).toHaveAttribute('href', 'https://chatgpt.com')
    expect(card).toHaveAttribute('target', '_blank')
    expect(card).toHaveAttribute('rel', 'noreferrer')
    fireEvent.click(card)
    expect(localStorage.getItem('aimatrix:recent')).toContain('gpt')
  })

  it('renders a disabled non-link card for an invalid url', () => {
    const { container } = renderCard({ ...baseLink, url: 'ftp://bad' })
    expect(screen.queryByRole('link')).toBeNull()
    const card = container.querySelector('.link-card')
    expect(card).toHaveAttribute('aria-disabled', 'true')
    expect(card).toHaveAttribute('title', '非法 URL: ftp://bad')
    // 非法 URL 不展示域名行，且不写入最近使用
    expect(screen.queryByText('chatgpt.com')).toBeNull()
    expect(localStorage.getItem('aimatrix:recent')).toBeNull()
  })

  it('shows a dash placeholder when description is empty', () => {
    renderCard({ ...baseLink, description: '' })
    expect(screen.getByText('—')).toBeTruthy()
  })

  it('copies the url to the clipboard without navigating away', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderCard(baseLink)

    const btn = screen.getByRole('button', { name: '复制链接地址' })
    fireEvent.click(btn)
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://chatgpt.com'))
    // 复制后切换为"已复制"反馈态，且不写入最近使用（复制不算访问）
    expect(screen.getByRole('button', { name: '已复制链接地址' })).toBeTruthy()
    expect(localStorage.getItem('aimatrix:recent')).toBeNull()
  })

  it('uses the uppercased first letter of the name as the initial', () => {
    renderCard({ ...baseLink, name: 'chatgpt' })
    expect(screen.getByText('C')).toBeTruthy()
  })
})
