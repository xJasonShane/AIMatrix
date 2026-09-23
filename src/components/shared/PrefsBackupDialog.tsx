import { useEffect, useRef, useState, type ClipboardEvent, type MouseEvent } from 'react'
import { m } from 'framer-motion'
import {
  getFavorites,
  getRecentLinks,
  setFavorites,
  setRecentLinks,
} from '../../store/uiPrefs'

interface Props {
  /** 当前数据中真实存在的链接 id：导入时过滤掉失效条目（JSON 内容已变更的场景） */
  knownIds: Set<string>
  onClose: () => void
}

/** 备份导出格式：version 便于未来字段演进；两端均为链接 id 数组（最新在前） */
interface BackupPayload {
  app: 'aimatrix'
  version: 1
  favorites: string[]
  recent: string[]
}

function buildExportText(): string {
  const payload: BackupPayload = {
    app: 'aimatrix',
    version: 1,
    favorites: getFavorites(),
    recent: getRecentLinks(),
  }
  return JSON.stringify(payload, null, 2)
}

/**
 * 收藏 / 最近使用的备份与恢复：纯前端实现（无后端、无网络请求），
 * 导出为 JSON 文本（复制到剪贴板），导入时粘贴同一格式。
 * 由父组件条件挂载（open 时渲染）：挂载即快照当前数据，无需 effect 内重置状态。
 * 弹层与 CommandPalette / ErrorBoundary 同一套视觉与关闭约定（Esc / 点击遮罩）。
 */
export function PrefsBackupDialog({ knownIds, onClose }: Props) {
  // 挂载时一次性快照当前收藏 / 最近使用（对话框存续期内收藏变化不回写，避免文本区跳动）
  const [exportText] = useState(buildExportText)
  const [importText, setImportText] = useState('')
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Esc 关闭 + 打开时锁定背景滚动（与 CommandPalette 同策略）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  const copyExport = async (e: MouseEvent) => {
    e.preventDefault()
    try {
      await navigator.clipboard.writeText(exportText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* 剪贴板不可用：静默降级，用户可手动全选文本区复制 */
    }
  }

  const runImport = () => {
    try {
      const raw: unknown = JSON.parse(importText)
      if (typeof raw !== 'object' || raw === null) throw new Error('root')
      const obj = raw as Record<string, unknown>
      const pickArr = (v: unknown): string[] =>
        Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
      // 过滤失效 id：JSON 数据可能已增删链接，仅导入当前数据中真实存在的条目
      const keep = (ids: string[]) => ids.filter((id) => knownIds.has(id))
      const favorites = keep(pickArr(obj.favorites))
      const recent = keep(pickArr(obj.recent))
      setFavorites(favorites)
      setRecentLinks(recent)
      setImportText('')
      setMessage({ ok: true, text: `已导入 ${favorites.length} 个收藏、${recent.length} 条最近使用。` })
    } catch {
      setMessage({ ok: false, text: '无法解析备份内容 —— 请粘贴此前导出的完整 JSON 文本。' })
    }
  }

  return (
    <m.div
      className="cmdk-overlay fixed inset-0 z-50 bg-ink/25 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="备份与导入"
    >
      <m.div
        ref={dialogRef}
        tabIndex={-1}
        className="cmdk-panel mx-auto mt-[12vh] w-[min(560px,92vw)] rounded-[14px] border border-line bg-paper-raised p-5 shadow-[0_24px_60px_-20px_rgba(60,45,25,0.5)] outline-none"
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
      >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="m-0 font-serif text-lg font-bold text-ink">备份与导入</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className="grid h-7 w-7 cursor-pointer place-items-center rounded-full border border-line bg-transparent text-ink-faint transition-colors hover:border-accent hover:text-accent"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                <path d="M2 2l8 8M10 2l-8 8" />
              </svg>
            </button>
          </div>

          {/* 导出区 */}
          <section>
            <div className="mb-1.5 flex items-center justify-between">
              <h3 className="m-0 font-mono text-xs font-semibold tracking-wide text-ink-soft">导出（复制保存）</h3>
              <button
                type="button"
                onClick={copyExport}
                className="cursor-pointer rounded-full border border-line bg-transparent px-3 py-1 font-mono text-xs text-ink-soft transition-colors hover:border-accent hover:text-accent"
                aria-label={copied ? '已复制备份内容' : '复制备份内容'}
              >
                {copied ? '已复制 ✓' : '复制'}
              </button>
            </div>
            <textarea
              readOnly
              value={exportText}
              onFocus={(e: React.SyntheticEvent<HTMLTextAreaElement>) => e.currentTarget.select()}
              rows={5}
              aria-label="备份内容（只读）"
              className="w-full resize-y rounded-lg border border-line bg-paper px-3 py-2 font-mono text-[11px] leading-relaxed text-ink-soft outline-none focus:border-accent"
            />
          </section>

          {/* 导入区 */}
          <section className="mt-4">
            <h3 className="mb-1.5 font-mono text-xs font-semibold tracking-wide text-ink-soft">导入（粘贴恢复）</h3>
            <textarea
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value)
                setMessage(null)
              }}
              onPaste={(e: ClipboardEvent<HTMLTextAreaElement>) => e.stopPropagation()}
              rows={4}
              placeholder="粘贴此前导出的 JSON…"
              aria-label="粘贴备份内容"
              className="w-full resize-y rounded-lg border border-line bg-paper px-3 py-2 font-mono text-[11px] leading-relaxed text-ink outline-none placeholder:text-ink-faint focus:border-accent"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={runImport}
                disabled={!importText.trim()}
                className="cursor-pointer rounded-full border border-accent bg-accent px-4 py-1.5 font-mono text-xs font-semibold text-paper-raised transition-opacity disabled:cursor-default disabled:opacity-40"
              >
                导入
              </button>
              {message && (
                <p role="status" className={`m-0 text-xs ${message.ok ? 'text-ink-soft' : 'text-accent'}`}>
                  {message.text}
                </p>
              )}
            </div>
          </section>
        </m.div>
    </m.div>
  )
}
