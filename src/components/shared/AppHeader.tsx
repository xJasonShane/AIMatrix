import { Link } from 'react-router-dom'
import { ShortcutHelp } from './ShortcutHelp'

interface Props {
  view: 'nav' | 'matrix'
}

// 悬停预取矩阵视图 chunk（App 中经 React.lazy 按需加载）：模块缓存去重，多次触发只请求一次
const prefetchMatrix = () => void import('../../pages/MatrixPage')

export function AppHeader({ view }: Props) {
  return (
    <header className="app-header sticky top-0 z-20 flex items-center justify-between border-b border-line bg-paper/85 px-7 py-[18px] backdrop-blur-md shadow-[0_8px_24px_-20px_rgba(30,60,52,0.7)]">
      <div className="flex items-baseline gap-2.5">
        <span className="brand-mark inline-block rounded-[3px] bg-accent px-1 py-[5px] text-[11px] leading-none text-paper-raised shadow-sm">
          ▮
        </span>
        <span className="brand-name font-serif text-[19px] font-bold tracking-[3px] text-ink">
          AI MATRIX
        </span>
        <span className="brand-sub text-xs text-ink-faint">个人 AI 工具导航矩阵</span>
      </div>
      <div className="flex items-center gap-2.5">
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
            onMouseEnter={prefetchMatrix}
            className={`switch-btn rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all active:scale-95${
              view === 'matrix' ? ' active bg-ink text-paper-raised' : ' text-ink-soft hover:text-accent'
            }`}
            aria-current={view === 'matrix' ? 'page' : undefined}
          >
            矩阵
          </Link>
        </nav>
        {/* 快捷键帮助（? 唤起）：两视图共用，置于视图切换右侧 */}
        <ShortcutHelp />
      </div>
    </header>
  )
}
