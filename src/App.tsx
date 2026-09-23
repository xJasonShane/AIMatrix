import { lazy, Suspense, useEffect } from 'react'
import { LazyMotion, MotionConfig, domAnimation, m } from 'framer-motion'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { NavProvider, useNav } from './store/useNavStore'
import { isTypingTarget } from './hooks/useKeyboard'
import { DataError } from './components/shared/DataError'
import { ErrorBoundary } from './components/shared/ErrorBoundary'
import { CommandPalette } from './components/shared/CommandPalette'
import { NavPage } from './pages/NavPage'

// 路由级代码分割：矩阵视图（RadialTree/MatrixRain 及其动画特性）按需加载，首屏只含导航视图
// 代码；导航视图为默认落地页，保持同步引入避免首屏出现加载占位
const MatrixPage = lazy(() =>
  import('./pages/MatrixPage').then((m) => ({ default: m.MatrixPage })),
)

/** 懒加载路由的过渡占位（chunk 极小，通常仅闪现一帧） */
function RouteFallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center" aria-busy="true">
      <p className="font-mono text-xs tracking-[0.3em] text-ink-faint">LOADING…</p>
    </div>
  )
}

function Shell() {
  const { error } = useNav()
  const location = useLocation()
  const navigate = useNavigate()

  // 视图切换同步 document.title：浏览器历史/多标签页可辨识当前视图（未知路径经 * 重定向，仅显示站名）
  useEffect(() => {
    const viewTitle = { '/nav': '导航视图', '/matrix': '矩阵视图' }[location.pathname]
    document.title = viewTitle ? `AI Matrix · ${viewTitle}` : 'AI Matrix'
  }, [location.pathname])

  // GitHub 风格 g 序列快捷键：g→n 导航视图，g→m 矩阵视图（1.5s 内需跟上第二个键）
  useEffect(() => {
    let armed = false
    let timer = 0
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return
      if (e.key === 'g') {
        armed = true
        window.clearTimeout(timer)
        timer = window.setTimeout(() => (armed = false), 1500)
      } else if (armed && (e.key === 'n' || e.key === 'm')) {
        armed = false
        window.clearTimeout(timer)
        navigate(e.key === 'n' ? '/nav' : '/matrix')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(timer)
    }
  }, [navigate])

  if (error) return <DataError message={error} />
  return (
    <>
      {/* 键盘用户 Tab 首站：跳到主内容（置于按路由 key 的容器之外，避免切视图时重挂载） */}
      <a href="#main-content" className="skip-link">
        跳到主内容
      </a>
      <m.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        {/* 视图级错误边界：容器按路由 key 重挂载，切换视图即自动复位；
            Suspense 置于其内，chunk 加载失败同样落入回退卡片（"返回导航视图"仍可用） */}
        <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes location={location}>
              <Route path="/nav" element={<NavPage />} />
              <Route path="/matrix" element={<MatrixPage />} />
              <Route path="*" element={<Navigate to="/nav" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </m.div>
      {/* 全局命令面板：置于按路由 key 的容器之外，避免切视图时重挂载 */}
      <CommandPalette />
    </>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      {/* LazyMotion + domAnimation：仅打包动画/手势特性，剔除 drag/layout 体积 */}
      <LazyMotion features={domAnimation} strict>
        <NavProvider>
          <Shell />
        </NavProvider>
      </LazyMotion>
    </MotionConfig>
  )
}
