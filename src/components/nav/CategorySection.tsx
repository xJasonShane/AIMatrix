import { AnimatePresence, motion } from 'framer-motion'
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
    <section className="category mb-9" data-collapsed={collapsed} style={{ ['--cat' as string]: color }}>
      <button
        className="category-head flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-0 py-1.5 text-ink"
        onClick={onToggle}
        aria-expanded={!collapsed}
      >
        <span className="category-tape" aria-hidden />
        <h2 className="category-name m-0 font-serif text-[19px] font-bold tracking-wide text-ink">
          {category.name}
        </h2>
        <span className="category-count" style={{ color }}>
          {category.links.length}
        </span>
        <span className="category-caret ml-auto text-lg text-ink-faint" aria-hidden>
          <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="2" y1="7" x2="12" y2="7" />
            {!collapsed && <line x1="7" y1="2" x2="7" y2="12" />}
          </svg>
        </span>
      </button>
      <div className="category-rule" aria-hidden />
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            className="card-grid grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 pt-3.5"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            {category.links.map((l, i) => (
              <LinkCard key={l.id} link={l} color={color} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
