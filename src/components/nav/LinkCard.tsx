import { memo, useState, type MouseEvent } from 'react'
import { isValidUrl, type NavLink } from '../../data/schema'
import { pushRecentLink } from '../../store/uiPrefs'

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

function CardInner({
  link,
  color,
  showDomain,
}: {
  link: NavLink
  color: string
  showDomain: boolean
}) {
  const initial = link.name.trim().charAt(0).toUpperCase() || '?'
  return (
    <>
      <span className="card-initial" style={{ background: `${color}1f`, color }} aria-hidden>
        {initial}
      </span>
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
      <CopyUrlButton url={link.url} />
    </a>
  )
})
