import type { NavCategory } from '../../data/schema'
import { LinkCard } from './LinkCard'

const DEFAULT_COLOR = '#7a8a55'

interface Props {
  category: NavCategory
  collapsed: boolean
  onToggle: () => void
}

export function CategorySection({ category, collapsed, onToggle }: Props) {
  const color = category.color ?? DEFAULT_COLOR
  return (
    <section className="category" data-collapsed={collapsed}>
      <button className="category-head" onClick={onToggle} aria-expanded={!collapsed}>
        <span className="category-bar" style={{ background: color }} />
        <h2 className="category-name">{category.name}</h2>
        <span className="category-count" style={{ color }}>{category.links.length}</span>
        <span className="category-caret" aria-hidden>{collapsed ? '+' : '−'}</span>
      </button>
      {!collapsed && (
        <div className="card-grid">
          {category.links.map((l) => (
            <LinkCard key={l.id} link={l} color={color} />
          ))}
        </div>
      )}
    </section>
  )
}
