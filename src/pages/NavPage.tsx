import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { m } from 'framer-motion'
import { AppHeader } from '../components/shared/AppHeader'
import { PrefsBackupDialog } from '../components/shared/PrefsBackupDialog'
import { CategorySection } from '../components/nav/CategorySection'
import { LinkCard } from '../components/nav/LinkCard'
import { useNav, useCollapse } from '../store/useNavStore'
import { useFocusOnSlash } from '../hooks/useKeyboard'
import { getFavorites, getRecentLinks, subscribeFavorites, subscribeRecentLinks } from '../store/uiPrefs'
import { DEFAULT_COLOR, matchesQuery } from '../data/schema'
import type { NavCategory, NavLink } from '../data/schema'

/** 链接网格区块：收藏 / 最近使用共用的分类卡结构（胶带标题 + 渐变引导线 + 网格） */
function LinkGridSection({
  label,
  title,
  links,
  colorVar,
}: {
  label: string
  title: string
  links: { link: NavLink; color: string }[]
  colorVar: string
}) {
  return (
    <section className="category mb-9" aria-label={label} style={{ ['--cat' as string]: colorVar }}>
      <div className="flex items-center gap-3 px-0 py-1.5">
        <span className="category-tape" aria-hidden />
        <h2 className="category-name m-0 font-serif text-[19px] font-bold tracking-wide text-ink">
          {title}
        </h2>
        <span className="category-count" style={{ color: colorVar }}>
          {links.length}
        </span>
      </div>
      <div className="category-rule" aria-hidden />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 pt-3.5">
        {links.map(({ link, color }, i) => (
          <LinkCard key={link.id} link={link} color={color} index={i} />
        ))}
      </div>
    </section>
  )
}

export function NavPage() {
  const { data, error, loading } = useNav()
  const { setAllCollapsed } = useCollapse()
  // 搜索词同步到 URL（?q=…）：刷新/分享链接保留搜索状态；键入以 replace 写入避免污染历史栈
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const q = query.trim().toLowerCase()
  const setQuery = useCallback(
    (value: string) => setSearchParams(value ? { q: value } : {}, { replace: true }),
    [setSearchParams],
  )
  const searchRef = useRef<HTMLInputElement>(null)
  // 备份对话框开关：收藏 / 最近使用数据导出与导入（纯本地，无网络请求）
  const [backupOpen, setBackupOpen] = useState(false)

  // 矩阵视图联动（/nav?cat=<id>）：数据就绪后滚动定位到对应分类；
  // 高亮为派生值（catParam 匹配即加类），动画 2.2s 播完归于透明，无需额外状态
  const catParam = searchParams.get('cat')
  useEffect(() => {
    if (!catParam || loading || error) return
    const el = document.getElementById(`cat-${catParam}`)
    if (!el) return
    // jsdom 等环境未实现 scrollIntoView：可选调用避免崩溃
    el.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }, [catParam, loading, error])

  // GitHub 风格快捷键："/" 聚焦搜索框（共享 hook：输入控件内按下不拦截，交由默认行为）
  useFocusOnSlash(searchRef)

  /** 按名称 / 描述 / URL（含域名）/ 标签即时过滤；搜索时忽略折叠状态，只显示有命中的分类 */
  const visibleCategories = useMemo<NavCategory[]>(
    () =>
      q
        ? data.categories
            .map((c) => ({
              ...c,
              links: c.links.filter((l) =>
                matchesQuery(q, l.name, l.description, l.url, ...(l.tags ?? [])),
              ),
            }))
            .filter((c) => c.links.length > 0)
        : data.categories,
    [data, q],
  )
  const matchedCount = useMemo(
    () => visibleCategories.reduce((n, c) => n + c.links.length, 0),
    [visibleCategories],
  )

  /** id → {链接, 颜色} 索引：收藏区与最近使用区共用 */
  const linkMap = useMemo(() => {
    const map = new Map<string, { link: NavLink; color: string }>()
    data.categories.forEach((c) =>
      c.links.forEach((l) => map.set(l.id, { link: l, color: c.color ?? DEFAULT_COLOR })),
    )
    return map
  }, [data])

  /** 有效链接 id 集合：备份导入时过滤掉数据中已不存在的失效条目 */
  const knownIds = useMemo(() => new Set(linkMap.keys()), [linkMap])

  /** 最近使用：点击链接后通过事件订阅即时刷新（无需重新进入页面） */
  const [recentIds, setRecentIds] = useState<string[]>(() => getRecentLinks())
  useEffect(() => subscribeRecentLinks(() => setRecentIds(getRecentLinks())), [])

  const recentLinks = useMemo(
    () =>
      q
        ? []
        : recentIds
            .map((id) => linkMap.get(id))
            .filter((x): x is { link: NavLink; color: string } => Boolean(x))
            .slice(0, 6),
    [q, linkMap, recentIds],
  )

  /** 收藏：星标切换后通过事件订阅即时刷新（搜索时同样隐藏） */
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getFavorites())
  useEffect(() => subscribeFavorites(() => setFavoriteIds(getFavorites())), [])

  const favoriteLinks = useMemo(
    () =>
      q
        ? []
        : favoriteIds
            .map((id) => linkMap.get(id))
            .filter((x): x is { link: NavLink; color: string } => Boolean(x)),
    [q, linkMap, favoriteIds],
  )

  const { categoryCount, toolCount } = useMemo(
    () => ({
      categoryCount: data.categories.length,
      toolCount: data.categories.reduce((n, c) => n + c.links.length, 0),
    }),
    [data],
  )

  return (
    <div className="page page-nav flex min-h-full flex-col">
      <AppHeader view="nav" />

      <main
        id="main-content"
        className="nav-main mx-auto w-[min(1160px,100%-48px)] flex-1 pb-16 pt-8"
      >
        {/* Hero */}
        <m.section
          className="relative mb-10 border-b border-line pb-7"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <p className="mb-2 font-mono text-xs tracking-[0.3em] text-accent">PERSONAL AI MATRIX</p>
          <h1 className="m-0 font-serif text-5xl font-bold leading-tight tracking-tight text-ink">
            个人 AI 工具矩阵
          </h1>
          <p className="mt-3 text-[15px] text-ink-soft">精选常用 AI 工具 · 一键直达</p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {/* 加载期以 "…" 占位：避免弱网下闪现「0 个分类 · 0 个工具」；批量折叠按钮同步禁用 */}
            <m.span
              className="rounded-full border border-line px-3.5 py-1.5 font-mono text-xs text-ink-soft"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15 }}
            >
              {loading ? '…' : `${categoryCount} 个分类`}
            </m.span>
            <m.span
              className="rounded-full border border-line px-3.5 py-1.5 font-mono text-xs text-ink-soft"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.25 }}
            >
              {loading ? '…' : q ? `匹配 ${matchedCount} / ${toolCount} 个工具` : `${toolCount} 个工具`}
            </m.span>
            {/* 批量折叠：分类多时逐个折叠低效，一次性全部收起/展开（状态同样持久化） */}
            <m.button
              type="button"
              onClick={() => setAllCollapsed(true)}
              disabled={loading}
              className="cursor-pointer rounded-full border border-line px-3.5 py-1.5 font-mono text-xs text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:cursor-default disabled:opacity-50 disabled:hover:border-line disabled:hover:text-ink-soft"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.3 }}
            >
              全部收起
            </m.button>
            <m.button
              type="button"
              onClick={() => setAllCollapsed(false)}
              disabled={loading}
              className="cursor-pointer rounded-full border border-line px-3.5 py-1.5 font-mono text-xs text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:cursor-default disabled:opacity-50 disabled:hover:border-line disabled:hover:text-ink-soft"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.35 }}
            >
              全部展开
            </m.button>
          </div>

          {/* 即时搜索框 */}
          <m.div
            className="mt-6 flex max-w-[420px] items-center gap-2 rounded-full border border-line bg-paper-raised px-4 py-2 shadow-[inset_0_1px_3px_rgba(80,60,30,0.08)] transition-colors focus-within:border-accent"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.35 }}
          >
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
              placeholder="搜索工具名称或描述…"
              aria-label="搜索工具"
              className="w-full border-0 bg-transparent p-0 font-sans text-[13.5px] text-ink outline-none placeholder:text-ink-faint"
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
                Ctrl K
              </kbd>
            )}
          </m.div>

          {/* 即时搜索：结果数通过 aria-live 向读屏播报（区域常驻 DOM，仅内容变化） */}
          <p className="sr-only" aria-live="polite">
            {q ? (matchedCount > 0 ? `找到 ${matchedCount} 个匹配工具` : '没有找到匹配的工具') : ''}
          </p>

          {/* 赭橙印章点缀 */}
          <span
            className="absolute bottom-6 right-0 grid h-9 w-9 place-items-center rounded-[4px] border-2 border-accent/70 font-serif text-[10px] font-bold leading-[1.1] text-accent/80"
            aria-hidden
          >
            精选
          </span>
        </m.section>

        {!error && !loading && q === '' && data.categories.length === 0 && (
          <p className="py-10 text-center text-ink-soft">
            还没有任何链接 —— 请编辑{' '}
            <code className="font-mono text-accent">public/data/navigation.json</code> 添加你的 AI
            工具。
          </p>
        )}
        {!error && q !== '' && visibleCategories.length === 0 && (
          <p className="py-10 text-center text-ink-soft">
            没有匹配「{query.trim()}」的工具 —— 试试其他关键词。
          </p>
        )}
        {/* 收藏置顶区（仅非搜索状态展示）：星标切换后经事件订阅即时出现/消失 */}
        {favoriteLinks.length > 0 && (
          <LinkGridSection label="收藏" title="收藏" links={favoriteLinks} colorVar="var(--color-accent)" />
        )}
        {/* 最近使用（仅非搜索状态展示） */}
        {recentLinks.length > 0 && (
          <LinkGridSection label="最近使用" title="最近使用" links={recentLinks} colorVar="var(--color-accent)" />
        )}
        {visibleCategories.map((c) => (
          <CategorySection
            key={c.id}
            category={c}
            forceOpen={q !== ''}
            highlight={catParam === c.id}
          />
        ))}
      </main>

      <footer className="flex justify-between border-t border-line px-7 py-[18px] font-mono text-xs text-ink-faint">
        <span>数据源：public/data/navigation.json（运行时加载，替换即生效）</span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setBackupOpen(true)}
            className="cursor-pointer border-0 bg-transparent p-0 font-mono text-xs text-ink-faint transition-colors hover:text-accent"
          >
            备份 / 导入
          </button>
          <Link to="/matrix" className="text-accent hover:underline">
            进入矩阵视图 →
          </Link>
        </div>
      </footer>

      {/* 收藏 / 最近使用备份对话框（条件挂载：挂载即快照当前数据） */}
      {backupOpen && (
        <PrefsBackupDialog knownIds={knownIds} onClose={() => setBackupOpen(false)} />
      )}
    </div>
  )
}
