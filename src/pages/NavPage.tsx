import { Link } from 'react-router-dom'
import { AppHeader } from '../components/shared/AppHeader'
import { CategorySection } from '../components/nav/CategorySection'
import { useNav } from '../store/useNavStore'

export function NavPage() {
  const { data, error, isCollapsed, toggleCollapse } = useNav()

  return (
    <div className="page page-nav">
      <AppHeader view="nav" />
      <main className="nav-main">
        {error && <DataErrorInline />}
        {!error && data.categories.length === 0 && (
          <p className="empty-hint">
            还没有任何链接 —— 请编辑 <code>src/data/navigation.json</code> 添加你的 AI 工具。
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
      <footer className="app-footer">
        <span>数据源：src/data/navigation.json</span>
        <Link to="/matrix">进入矩阵视图 →</Link>
      </footer>
    </div>
  )
}

function DataErrorInline() {
  return <p className="empty-hint">数据加载失败，请检查 navigation.json。</p>
}
