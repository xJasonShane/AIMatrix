import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LazyMotion, domAnimation } from 'framer-motion'
import { PrefsBackupDialog } from './PrefsBackupDialog'
import {
  toggleFavorite,
  pushRecentLink,
  getFavorites,
  getRecentLinks,
  setFavorites,
  setRecentLinks,
} from '../../store/uiPrefs'

// 仅含部分真实 id：验证导入时会丢弃数据中已不存在的失效条目
const knownIds = new Set(['gpt', 'claude'])

const renderDialog = () =>
  render(
    <LazyMotion features={domAnimation} strict>
      <PrefsBackupDialog knownIds={knownIds} onClose={() => {}} />
    </LazyMotion>,
  )

beforeEach(() => {
  localStorage.clear()
  // uiPrefs 有模块级内存回退：仅清 localStorage 不够，需整体覆写重置跨用例污染
  setFavorites([])
  setRecentLinks([])
})

describe('PrefsBackupDialog', () => {
  it('exports current favorites and recent links as versioned JSON', () => {
    toggleFavorite('gpt')
    pushRecentLink('claude')
    renderDialog()
    const textarea = screen.getByLabelText('备份内容（只读）') as HTMLTextAreaElement
    const parsed = JSON.parse(textarea.value)
    expect(parsed).toMatchObject({
      app: 'aimatrix',
      version: 1,
      favorites: ['gpt'],
      recent: ['claude'],
    })
  })

  it('imports pasted JSON and drops ids missing from current data', () => {
    setFavorites([])
    setRecentLinks([])
    renderDialog()
    fireEvent.change(screen.getByLabelText('粘贴备份内容'), {
      target: {
        value: JSON.stringify({
          app: 'aimatrix',
          version: 1,
          favorites: ['gpt', 'ghost'],
          recent: ['claude', 'ghost'],
        }),
      },
    })
    fireEvent.click(screen.getByRole('button', { name: '导入' }))
    expect(getFavorites()).toEqual(['gpt'])
    expect(getRecentLinks()).toEqual(['claude'])
    expect(screen.getByRole('status').textContent).toContain('已导入 1 个收藏、1 条最近使用')
  })

  it('shows an error message for unparseable content', () => {
    renderDialog()
    fireEvent.change(screen.getByLabelText('粘贴备份内容'), {
      target: { value: '不是 JSON 的文本' },
    })
    fireEvent.click(screen.getByRole('button', { name: '导入' }))
    expect(screen.getByRole('status').textContent).toContain('无法解析')
    expect(getFavorites()).toEqual([])
  })
})
