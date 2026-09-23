import { memo, useEffect, useState, type MouseEvent } from 'react'
import { isValidUrl, type NavLink } from '../../data/schema'
import { getFavorites, pushRecentLink, subscribeFavorites, toggleFavorite } from '../../store/uiPrefs'

interface Props {
  link: NavLink
  color: string
  index: number
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** 星形 path：24 视窗五角星，卡片与矩阵浮层共用同一形状 */
export const STAR_ICON_D =
  'M12 2.5l2.95 6.03 6.65.96-4.8 4.68 1.13 6.6L12 17.63l-5.93 3.12 1.13-6.6-4.8-4.68 6.65-.96L12 2.5z'

/** 星标按钮：切换收藏状态；已收藏常显（强调色实心），未收藏 hover/键盘 focus-within 显现 */
function FavoriteStarButton({ id }: { id: string }) {
  // 自订阅收藏事件：状态切换即时反映（与 pushRecentLink 事件模式一致）
  const [faved, setFaved] = useState(() => getFavorites().includes(id))
  useEffect(() => subscribeFavorites(() => setFaved(getFavorites().includes(id))), [id])
  const onClick = (e: MouseEvent) => {
    // 阻止冒泡到 <a>：只切换收藏，不跳转、不计入最近使用
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(id)
  }
  return (
    <button
      type="button"
      className={`card-star${faved ? ' faved' : ''}`}
      onClick={onClick}
      aria-pressed={faved}
      aria-label={faved ? '取消收藏' : '收藏'}
      title={faved ? '取消收藏' : '收藏'}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden>
        <path
          d={STAR_ICON_D}
          fill={faved ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

/** 复制链接地址：1.5s 后复位图标；剪贴板不可用时静默降级 */
function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  const onClick = async (e: MouseEvent) => {
    // 阻止冒泡到 <a>：只复制，不跳转
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* 剪贴板不可用（旧浏览器/非安全上下文）：静默降级 */
    }
  }
  return (
    <button
      type="button"
      className="card-copy"
      onClick={onClick}
      aria-label={copied ? '已复制链接地址' : '复制链接地址'}
      title={copied ? '已复制' : '复制链接地址'}
    >
      {copied ? (
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M2.5 7.5 5.5 10.5 11.5 3.5" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="4.5" y="4.5" width="8" height="8" rx="1.5" />
          <path d="M9.5 4.5v-2A1.5 1.5 0 0 0 8 1H3a1.5 1.5 0 0 0-1.5 1.5V8A1.5 1.5 0 0 0 3 9.5h2" />
        </svg>
      )}
    </button>
  )
}

/** 链接图标：icon 字段存在且加载成功时显示图片，否则降级为首字母色块（同一兜底路径） */
function CardIcon({ link, color }: { link: NavLink; color: string }) {
  const [broken, setBroken] = useState(false)
  const initial = link.name.trim().charAt(0).toUpperCase() || '?'
  if (!link.icon || broken) {
    return (
      <span className="card-initial" style={{ background: `${color}1f`, color }} aria-hidden>
        {initial}
      </span>
    )
  }
  return (
    <img
      className="card-icon"
      src={link.icon}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
    />
  )
}

function CardInner({
  link,
  color,
  showDomain,
}: {
  link: NavLink
  color: string
  showDomain: boolean
}) {
  return (
    <>
      <CardIcon link={link} color={color} />
      <span className="flex min-w-0 flex-1 flex-col gap-[3px] text-left">
        <span className="truncate text-[14.5px] font-semibold text-ink">{link.name}</span>
        <span className="truncate text-xs text-ink-faint">{link.description || '—'}</span>
        {showDomain && (
          <span className="truncate font-mono text-[10.5px] tracking-wide text-ink-faint/80">
            {hostnameOf(link.url)}
          </span>
        )}
      </span>
      <svg
        className="card-arrow h-3.5 w-3.5 shrink-0 text-ink-faint transition-transform duration-200"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3.5 10.5 10.5 3.5M4.5 3.5h6v6" />
      </svg>
    </>
  )
}

export const LinkCard = memo(function LinkCard({ link, color, index }: Props) {
  const valid = isValidUrl(link.url)

  if (!valid) {
    return (
      <div
        className="link-card disabled cursor-not-allowed"
        aria-disabled="true"
        title={`非法 URL: ${link.url}`}
        style={{ ['--cat' as string]: color, animationDelay: `${index * 30}ms` }}
      >
        <CardInner link={link} color={color} showDomain={false} />
      </div>
    )
  }

  return (
    <a
      className="link-card group"
      href={link.url}
      target="_blank"
      rel="noreferrer"
      onClick={() => pushRecentLink(link.id)}
      style={{ ['--cat' as string]: color }}
    >
      <CardInner link={link} color={color} showDomain />
      <FavoriteStarButton id={link.id} />
      <CopyUrlButton url={link.url} />
    </a>
  )
})
