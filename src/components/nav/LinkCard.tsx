import type { NavLink } from '../../data/schema'

interface Props {
  link: NavLink
  color: string
}

export function LinkCard({ link, color }: Props) {
  const valid = /^https?:\/\//.test(link.url)
  const initial = link.name.trim().charAt(0).toUpperCase() || '?'
  if (!valid) {
    return (
      <div className="link-card disabled" aria-disabled="true" title={`非法 URL: ${link.url}`}>
        <span className="card-initial" style={{ background: `${color}22`, color }}>{initial}</span>
        <span className="card-body">
          <span className="card-name">{link.name}</span>
          <span className="card-desc">{link.description || 'URL 非法'}</span>
        </span>
      </div>
    )
  }
  return (
    <a
      className="link-card"
      href={link.url}
      target="_blank"
      rel="noreferrer"
      style={{ ['--cat' as string]: color }}
    >
      <span className="card-initial" style={{ background: `${color}22`, color }}>{initial}</span>
      <span className="card-body">
        <span className="card-name">{link.name}</span>
        <span className="card-desc">{link.description}</span>
      </span>
      <span className="card-arrow" aria-hidden>↗</span>
    </a>
  )
}
