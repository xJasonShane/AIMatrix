import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { useNav } from '../../store/useNavStore'
import { DEFAULT_COLOR, isValidUrl } from '../../data/schema'
import { pushRecentLink } from '../../store/uiPrefs'

interface PaletteAction {
  id: string
  name: string
  description: string
  kind: '视图' | '链接'
  run: () => void
}

/** 全局命令面板：Ctrl/Cmd+K 唤起，搜索链接与视图切换动作 */
export function CommandPalette() {
  const { data } = useNav()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Ctrl/Cmd+K 开关，Esc 关闭；打开/关闭时重置搜索状态（事件处理器中重置，避免 effect 内 setState）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
        setQuery('')
        setActiveIdx(0)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 0)
      return () => window.clearTimeout(t)
    }
  }, [open])

  // 焦点陷阱：Tab/Shift+Tab 在面板内循环；打开时锁背景滚动
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusables = panel.querySelectorAll<HTMLElement>(
        'input, button, a[href], [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  const actions = useMemo<PaletteAction[]>(() => {
    const q = query.trim().toLowerCase()
    const views: PaletteAction[] = [
      { id: 'view-nav', name: '导航视图', description: '切换到卡片导航页', kind: '视图', run: () => navigate('/nav') },
      { id: 'view-matrix', name: '矩阵视图', description: '切换到径向矩阵树页', kind: '视图', run: () => navigate('/matrix') },
    ]
    const links: PaletteAction[] = data.categories.flatMap((c) =>
      c.links
        // 非法 URL 与 LinkCard / 矩阵节点保持同一策略：不在面板中提供打开入口
        .filter((l) => isValidUrl(l.url))
        .map((l) => ({
          id: `link-${l.id}`,
          name: l.name,
          description: `${c.name}${l.description ? ' · ' + l.description : ''}`,
          kind: '链接' as const,
          run: () => {
            // 与 LinkCard / RadialTree 一致：记录最近使用后再打开
            pushRecentLink(l.id)
            window.open(l.url, '_blank', 'noopener,noreferrer')
          },
        })),
    )
    const all = [...views, ...links]
    if (!q) return all
    return all.filter(
      (a) => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q),
    )
  }, [data, query, navigate])

  const runAction = (a: PaletteAction) => {
    setOpen(false)
    a.run()
  }

  return (
    <AnimatePresence>
      {open && (
        <m.div
          className="cmdk-overlay fixed inset-0 z-50 bg-ink/25 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="命令面板"
        >
          <m.div
            ref={panelRef}
            className="cmdk-panel mx-auto mt-[12vh] w-[min(560px,92vw)] overflow-hidden rounded-[14px] border border-line bg-paper-raised shadow-[0_24px_60px_-20px_rgba(60,45,25,0.5)]"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
              <svg
                className="h-4 w-4 shrink-0 text-ink-faint"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                aria-hidden
              >
                <circle cx="7" cy="7" r="4.5" />
                <path d="M10.5 10.5 14 14" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setActiveIdx((i) => Math.min(i + 1, actions.length - 1))
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setActiveIdx((i) => Math.max(i - 1, 0))
                  } else if (e.key === 'Enter' && actions[activeIdx]) {
                    e.preventDefault()
                    runAction(actions[activeIdx])
                  }
                }}
                placeholder="搜索工具或视图…"
                aria-label="命令搜索"
                role="combobox"
                aria-expanded={actions.length > 0}
                aria-controls="cmdk-list"
                aria-activedescendant={actions[activeIdx] ? `cmdk-opt-${activeIdx}` : undefined}
                className="w-full border-0 bg-transparent p-0 font-sans text-[14px] text-ink outline-none placeholder:text-ink-faint"
              />
              <kbd className="shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">
                Esc
              </kbd>
            </div>

            {actions.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-ink-soft">
                没有匹配「{query.trim()}」的结果
              </p>
            ) : (
              <ul id="cmdk-list" role="listbox" aria-label="结果列表" className="cmdk-list m-0 max-h-[320px] list-none overflow-y-auto p-1.5">
                {actions.map((a, i) => (
                  <li
                    key={a.id}
                    id={`cmdk-opt-${i}`}
                    role="option"
                    aria-selected={i === activeIdx}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-[9px] px-3 py-2${i === activeIdx ? ' bg-paper-sunken' : ''}`}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => runAction(a)}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: a.kind === '视图' ? 'var(--color-accent)' : DEFAULT_COLOR }}
                      aria-hidden
                    />
                    <span className="shrink-0 text-[13.5px] font-semibold text-ink">{a.name}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-ink-soft">{a.description}</span>
                    <span className="shrink-0 rounded border border-line px-1.5 py-px font-mono text-[10px] text-ink-faint">
                      {a.kind}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
