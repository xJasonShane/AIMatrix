import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AppHeader } from '../components/shared/AppHeader'
import { MatrixRain } from '../components/matrix/MatrixRain'
import { RadialTree } from '../components/matrix/RadialTree'
import { useNav } from '../store/useNavStore'
import { useFocusOnSlash } from '../hooks/useKeyboard'
import { matchesQuery } from '../data/schema'

export function MatrixPage() {
  const { data } = useNav()
  const mainRef = useRef<HTMLElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  // 直接实测内容区尺寸，自动适配页头实际高度（无需硬编码偏移量）
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== 'undefined' && document.fullscreenElement != null,
  )
  // 矩阵视图搜索：命中节点高亮，未命中压暗；规则与导航视图一致
  // 搜索词同步到 URL（?q=…）：刷新/分享链接保留搜索状态；键入以 replace 写入避免污染历史栈
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const q = query.trim().toLowerCase()
  const setQuery = useCallback(
    (value: string) => setSearchParams(value ? { q: value } : {}, { replace: true }),
    [setSearchParams],
  )
  const matchedCount = useMemo(
    () =>
      q
        ? data.categories.reduce(
            (n, c) =>
              n +
              c.links.filter((l) =>
                matchesQuery(q, l.name, l.description, l.url, ...(l.tags ?? [])),
              ).length,
            0,
          )
        : 0,
    [data, q],
  )

  // GitHub 风格快捷键："/" 聚焦矩阵搜索框（共享 hook：输入控件内按下不拦截）
  useFocusOnSlash(searchRef)

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    let frame = 0
    let pending: { width: number; height: number } | null = null
    const apply = () => {
      frame = 0
      if (!pending) return
      const { width, height } = pending
      pending = null
      // 尺寸未变化时保持原对象引用，避免无意义重渲染（RO 首帧与等尺寸 resize）
      setSize((prev) =>
        prev && prev.width === width && prev.height === height ? prev : { width, height },
      )
    }
    const ro = new ResizeObserver(() => {
      // 突发回调只记录最新尺寸并申请一帧：同一帧内的多次回调合并为一次重算
      pending = { width: el.clientWidth, height: el.clientHeight }
      if (!frame) frame = requestAnimationFrame(apply)
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    const onFs = () => setIsFullscreen(document.fullscreenElement != null)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void document.documentElement.requestFullscreen().catch(() => {})
    }
  }

  return (
    <div className="page page-matrix">
      <MatrixRain />
      <div className="matrix-vignette" aria-hidden="true" />
      <div className="matrix-overlay">
        <AppHeader view="matrix" />
        <main className="matrix-main" ref={mainRef} id="main-content">
          {size && <RadialTree data={data} width={size.width} height={size.height} query={query} />}
          {/* 搜索条：命中节点高亮、未命中压暗；Esc 清空 */}
          <div className="matrix-search" role="search">
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
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setQuery('')
              }}
              placeholder="搜索矩阵节点…"
              aria-label="搜索矩阵节点"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="清除搜索"
                className="shrink-0 cursor-pointer border-0 bg-transparent p-0 text-ink-faint transition-colors hover:text-accent"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                  <path d="M2 2l8 8M10 2l-8 8" />
                </svg>
              </button>
            )}
            {!q && (
              <kbd className="pointer-events-none shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">
                /
              </kbd>
            )}
          </div>
          {/* 搜索无结果空态 */}
          {q && matchedCount === 0 && (
            <p className="matrix-empty" role="status">
              没有匹配「{query.trim()}」的节点 —— 试试其他关键词。
            </p>
          )}
          <button
            type="button"
            className="fullscreen-btn"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? '退出全屏' : '进入全屏'}
            title={isFullscreen ? '退出全屏' : '进入全屏'}
          >
            {isFullscreen ? (
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                <path d="M5.5 1.5v4h-4M9.5 13.5v-4h4" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                <path d="M1.5 5.5v-4h4M13.5 9.5v4h-4" />
              </svg>
            )}
          </button>
          {/* 罗盘角标 */}
          <span
            className="pointer-events-none absolute bottom-5 right-7 flex flex-col items-center font-serif text-[10px] tracking-[2px] text-ink-faint"
            aria-hidden
          >
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="13" cy="13" r="11" strokeDasharray="2 3" />
              <path d="M13 4 L15 13 L13 22 L11 13 Z" fill="currentColor" stroke="none" opacity="0.7" />
            </svg>
            N
          </span>
        </main>
      </div>
    </div>
  )
}
