import { Link } from 'react-router-dom'

interface Props {
  view: 'nav' | 'matrix'
}

export function AppHeader({ view }: Props) {
  return (
    <header className="app-header sticky top-0 z-20 flex items-center justify-between border-b border-line bg-paper/90 px-7 py-[18px] backdrop-blur-md shadow-[0_10px_24px_-20px_rgba(80,60,30,0.9)]">
      <div className="flex items-baseline gap-2.5">
        <span className="brand-mark inline-block rounded-[3px] bg-accent px-1 py-[5px] text-[11px] leading-none text-paper-raised shadow-sm">
          ▮
        </span>
        <span className="brand-name font-serif text-[19px] font-bold tracking-[3px] text-ink">
          AI MATRIX
        </span>
        <span className="brand-sub text-xs text-ink-faint">个人 AI 工具导航矩阵</span>
      </div>
      <nav className="view-switch flex gap-1.5 rounded-full border border-line bg-paper-raised p-1" aria-label="视图切换">
        <Link
          to="/nav"
          className={`switch-btn rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all active:scale-95${
            view === 'nav' ? ' active bg-ink text-paper-raised' : ' text-ink-soft hover:text-accent'
          }`}
          aria-current={view === 'nav' ? 'page' : undefined}
        >
          导航
        </Link>
        <Link
          to="/matrix"
          className={`switch-btn rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all active:scale-95${
            view === 'matrix' ? ' active bg-ink text-paper-raised' : ' text-ink-soft hover:text-accent'
          }`}
          aria-current={view === 'matrix' ? 'page' : undefined}
        >
          矩阵
        </Link>
      </nav>
    </header>
  )
}
