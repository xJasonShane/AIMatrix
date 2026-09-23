import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { LazyMotion, domAnimation } from 'framer-motion'
import { ShortcutHelp } from './ShortcutHelp'

// m 组件的动画特性需由 LazyMotion 提供（生产环境由 App 统一注入）
const renderHelp = () =>
  render(
    <LazyMotion features={domAnimation} strict>
      <ShortcutHelp />
    </LazyMotion>,
  )

describe('ShortcutHelp', () => {
  it('opens via the ? key and closes with Escape', () => {
    renderHelp()
    expect(screen.queryByRole('dialog', { name: '键盘快捷键' })).toBeNull()
    fireEvent.keyDown(window, { key: '?' })
    expect(screen.getByRole('dialog', { name: '键盘快捷键' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: '键盘快捷键' })).toBeNull()
  })

  it('opens from the header button and closes via the close button', () => {
    renderHelp()
    fireEvent.click(screen.getByRole('button', { name: '查看键盘快捷键' }))
    expect(screen.getByRole('dialog', { name: '键盘快捷键' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(screen.queryByRole('dialog', { name: '键盘快捷键' })).toBeNull()
  })

  it('does not trigger while typing in an input', () => {
    renderHelp()
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    fireEvent.keyDown(input, { key: '?' })
    expect(screen.queryByRole('dialog', { name: '键盘快捷键' })).toBeNull()
    input.remove()
  })

  it('lists all registered shortcuts', () => {
    renderHelp()
    fireEvent.keyDown(window, { key: '?' })
    // 在 dialog 范围内查询：触发按钮文案 "?" 也含同字文本，避免多元素歧义
    const dialog = within(screen.getByRole('dialog', { name: '键盘快捷键' }))
    for (const keys of ['/', 'Ctrl K / ⌘ K', 'g n', 'g m', 'Esc', '?']) {
      expect(dialog.getByText(keys)).toBeInTheDocument()
    }
  })
})
