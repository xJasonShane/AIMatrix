import { MotionConfig, motion } from 'framer-motion'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { NavProvider, useNav } from './store/useNavStore'
import { DataError } from './components/shared/DataError'
import { NavPage } from './pages/NavPage'
import { MatrixPage } from './pages/MatrixPage'

function Shell() {
  const { error } = useNav()
  const location = useLocation()
  if (error) return <DataError message={error} />
  return (
    <motion.div
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
    </motion.div>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <NavProvider>
        <Shell />
      </NavProvider>
    </MotionConfig>
  )
}
