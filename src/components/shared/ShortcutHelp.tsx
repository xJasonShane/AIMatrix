import { useEffect, useRef, useState } from 'react'
import { m } from 'framer-motion'
import { isTypingTarget } from '../../hooks/useKeyboard'

/** 全站快捷键清单：与实现保持同步（新增快捷键时在此登记） */
const SHORTCUTS: { keys: string; desc: string }[] = [
  { keys: '/', desc: '聚焦搜索框（导航 / 矩阵视图）' },
  { keys: 'Ctrl K / ⌘ K', desc: '打开命令面板' },
  { keys: 'g n', desc: '切换到导航视图' },
  { keys: 'g m', desc: '切换到矩阵视图' },
  { keys: 'Esc', desc: '关闭弹层 / 清空搜索' },
  { keys: '?', desc: '打开本帮助面板' },
]

/**
 * 键盘快捷键帮助：页头 "?" 按钮或直接按 "?" 唤起。
 * 弹层复用命令面板的视觉与关闭约定（Esc / 点击遮罩 / 滚动锁定）。
 */
export function ShortcutHelp() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === '?') {
        // 输入控件聚焦时不拦截（交由正常键入，如搜索 "?" 本身）
        if (isTypingTarget(e.target)) return
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 打开时锁定背景滚动并聚焦面板（键盘用户可直接 Tab 遍历快捷键表）
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        className="help-btn"
        onClick={() => setOpen(true)}
        aria-label="查看键盘快捷键"
        title="键盘快捷键 (?)"
      >
        ?
      </button>
      {/* 条件渲染（无 AnimatePresence）：关闭即卸载，Esc/关闭按钮的断言行为可预期 */}
      {open && (
        <m.div
          className="cmdk-overlay fixed inset-0 z-50 bg-ink/25 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="键盘快捷键"
        >
          <m.div
            ref={panelRef}
            tabIndex={-1}
            className="cmdk-panel mx-auto mt-[16vh] w-[min(420px,92vw)] rounded-[14px] border border-line bg-paper-raised p-5 shadow-[0_24px_60px_-20px_rgba(60,45,25,0.5)] outline-none"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="m-0 font-serif text-lg font-bold text-ink">键盘快捷键</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭"
                className="grid h-7 w-7 cursor-pointer place-items-center rounded-full border border-line bg-transparent text-ink-faint transition-colors hover:border-accent hover:text-accent"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                  <path d="M2 2l8 8M10 2l-8 8" />
                </svg>
              </button>
            </div>
            <ul className="m-0 list-none p-0">
              {SHORTCUTS.map((s) => (
                <li key={s.keys} className="flex items-center justify-between gap-3 rounded-[9px] px-2 py-2">
                  <kbd className="shrink-0 rounded border border-line px-2 py-1 font-mono text-[11px] text-ink">
                    {s.keys}
                  </kbd>
                  <span className="text-right text-[13px] text-ink-soft">{s.desc}</span>
                </li>
              ))}
            </ul>
          </m.div>
        </m.div>
      )}
    </>
  )
}
