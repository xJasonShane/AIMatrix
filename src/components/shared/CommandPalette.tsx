import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { useNav } from '../../store/useNavStore'
import { DEFAULT_COLOR, isValidUrl, matchesQuery } from '../../data/schema'
import {
  getFavorites,
  getRecentLinks,
  pushRecentLink,
} from '../../store/uiPrefs'

interface PaletteAction {
  id: string
  name: string
  description: string
  kind: '视图' | '链接'
  /** 链接动作的原始 URL：参与搜索匹配（域名片段可直接命中） */
  url?: string
  run: () => void
}

/** 命中子串高亮：查询词首次出现处加 mark（不区分大小写），提升结果扫读效率 */
function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>
  const idx = text.toLowerCase().indexOf(q)
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="cmdk-hl">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  )
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

  // 高亮项变化时滚动入视野（block: nearest 只滚必要的最小距离，避免列表跳动）
  useEffect(() => {
    if (!open) return
    document
      .getElementById(`cmdk-opt-${activeIdx}`)
      ?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIdx, open])

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
          // 标签并入描述参与匹配（与导航/矩阵视图的搜索字段对齐）
          description: `${c.name}${
            l.tags?.length ? ' · ' + l.tags.join(' ') : ''
          }${l.description ? ' · ' + l.description : ''}`,
          kind: '链接' as const,
          url: l.url,
          run: () => {
            // 与 LinkCard / RadialTree 一致：记录最近使用后再打开
            pushRecentLink(l.id)
            window.open(l.url, '_blank', 'noopener,noreferrer')
          },
        })),
    )
    // 排序：收藏 > 最近使用 > 其余（组内分别按收藏/使用时序，其余保持数据顺序）；
    // 高频工具无需键入完整名称即可排到结果前列
    const favIdx = new Map(getFavorites().map((id, i) => [id, i]))
    const recentIdx = new Map(getRecentLinks().map((id, i) => [id, i]))
    const tierOf = (action: PaletteAction) => {
      const linkId = action.id.slice('link-'.length)
      if (favIdx.has(linkId)) return 0
      if (recentIdx.has(linkId)) return 1
      return 2
    }
    const orderOf = (action: PaletteAction) => {
      const linkId = action.id.slice('link-'.length)
      return favIdx.get(linkId) ?? recentIdx.get(linkId) ?? 0
    }
    links.sort((a, b) => {
      const ta = tierOf(a)
      const tb = tierOf(b)
      if (ta !== tb) return ta - tb
      return ta === 2 ? 0 : orderOf(a) - orderOf(b)
    })
    const all = [...views, ...links]
    if (!q) return all
    // 搜索匹配字段与导航/矩阵视图保持一致：名称 / 描述 / URL / 标签（标签并入描述）
    return all.filter((a) => matchesQuery(q, a.name, a.description, a.url ?? ''))
  }, [data, query, navigate])

  const runAction = (a: PaletteAction) => {
    setOpen(false)
    a.run()
  }

  const queryLc = query.trim().toLowerCase()

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
            className="cmdk-panel mx-auto mt-[12vh] w-[min(560px,92vw)] overflow-hidden rounded-[14px] border border-line bg-paper-raised shadow-[0_24px_60px_-20px_rgba(20,50,42,0.4)]"
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
                onChange={(e) => {
                  setQuery(e.target.value)
                  // 新查询重置高亮到首项：残留索引可能已超出过滤后的结果范围
                  setActiveIdx(0)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    // 循环导航：越过末项回到首项（空结果时保持 0）
                    setActiveIdx((i) => (actions.length ? (i + 1) % actions.length : 0))
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    // 循环导航：越过首项回到末项
                    setActiveIdx((i) => (actions.length ? (i - 1 + actions.length) % actions.length : 0))
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
                    <span className="shrink-0 text-[13.5px] font-semibold text-ink">
                      <Highlight text={a.name} q={queryLc} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-ink-soft">
                      <Highlight text={a.description} q={queryLc} />
                    </span>
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
