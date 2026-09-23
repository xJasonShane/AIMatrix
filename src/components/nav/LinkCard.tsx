import { memo } from 'react'
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
      className="link-card"
      href={link.url}
      target="_blank"
      rel="noreferrer"
      onClick={() => pushRecentLink(link.id)}
      style={{ ['--cat' as string]: color }}
    >
      <CardInner link={link} color={color} showDomain />
    </a>
  )
})
