import { Link } from 'react-router-dom'

interface Props {
  view: 'nav' | 'matrix'
}

export function AppHeader({ view }: Props) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark">▮</span>
        <span className="brand-name">AI MATRIX</span>
        <span className="brand-sub">个人 AI 工具导航矩阵</span>
      </div>
      <nav className="view-switch" aria-label="视图切换">
        <Link
          to="/nav"
          className={`switch-btn${view === 'nav' ? ' active' : ''}`}
          aria-current={view === 'nav' ? 'page' : undefined}
        >
          导航
        </Link>
        <Link
          to="/matrix"
          className={`switch-btn${view === 'matrix' ? ' active' : ''}`}
          aria-current={view === 'matrix' ? 'page' : undefined}
        >
          矩阵
        </Link>
      </nav>
    </header>
  )
}
