import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AppHeader } from '../components/shared/AppHeader'
import { CategorySection } from '../components/nav/CategorySection'
import { useNav } from '../store/useNavStore'

export function NavPage() {
  const { data, error, isCollapsed, toggleCollapse } = useNav()

  const categoryCount = data.categories.length
  const toolCount = data.categories.reduce((n, c) => n + c.links.length, 0)

  return (
    <div className="page page-nav flex min-h-full flex-col">
      <AppHeader view="nav" />

      <main className="nav-main mx-auto w-[min(1160px,100%-48px)] flex-1 pb-16 pt-8">
        {/* Hero */}
        <motion.section
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

          <div className="mt-5 flex flex-wrap gap-2.5">
            <motion.span
              className="rounded-full border border-line px-3.5 py-1.5 font-mono text-xs text-ink-soft"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15 }}
            >
              {categoryCount} 个分类
            </motion.span>
            <motion.span
              className="rounded-full border border-line px-3.5 py-1.5 font-mono text-xs text-ink-soft"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.25 }}
            >
              {toolCount} 个工具
            </motion.span>
          </div>

          {/* 赭橙印章点缀 */}
          <span
            className="absolute bottom-6 right-0 grid h-9 w-9 place-items-center rounded-[4px] border-2 border-accent/70 font-serif text-[10px] font-bold leading-[1.1] text-accent/80"
            aria-hidden
          >
            精选
          </span>
        </motion.section>

        {!error && data.categories.length === 0 && (
          <p className="py-10 text-center text-ink-soft">
            还没有任何链接 —— 请编辑 <code className="font-mono text-accent">src/data/navigation.json</code>{' '}
            添加你的 AI 工具。
          </p>
        )}
        {data.categories.map((c) => (
          <CategorySection
            key={c.id}
            category={c}
            collapsed={isCollapsed(c.id)}
            onToggle={() => toggleCollapse(c.id)}
          />
        ))}
      </main>

      <footer className="flex justify-between border-t border-line px-7 py-[18px] font-mono text-xs text-ink-faint">
        <span>数据源：src/data/navigation.json</span>
        <Link to="/matrix" className="text-accent hover:underline">
          进入矩阵视图 →
        </Link>
      </footer>
    </div>
  )
}
