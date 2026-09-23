import { useEffect } from 'react'
import { LazyMotion, MotionConfig, domAnimation, m } from 'framer-motion'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { NavProvider, useNav } from './store/useNavStore'
import { DataError } from './components/shared/DataError'
import { CommandPalette } from './components/shared/CommandPalette'
import { NavPage } from './pages/NavPage'
import { MatrixPage } from './pages/MatrixPage'

/** 快捷键守卫：输入控件聚焦或组合键按下时不触发（避免劫持正常键入） */
function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
  )
}

function Shell() {
  const { error } = useNav()
  const location = useLocation()
  const navigate = useNavigate()

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
        <Routes location={location}>
          <Route path="/nav" element={<NavPage />} />
          <Route path="/matrix" element={<MatrixPage />} />
          <Route path="*" element={<Navigate to="/nav" replace />} />
        </Routes>
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
