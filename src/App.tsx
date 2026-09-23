import { Navigate, Route, Routes } from 'react-router-dom'
import { NavProvider, useNav } from './store/useNavStore'
import { DataError } from './components/shared/DataError'
import { NavPage } from './pages/NavPage'
import { MatrixPage } from './pages/MatrixPage'

function Shell() {
  const { error } = useNav()
  if (error) return <DataError message={error} />
  return (
    <Routes>
      <Route path="/nav" element={<NavPage />} />
      <Route path="/matrix" element={<MatrixPage />} />
      <Route path="*" element={<Navigate to="/nav" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <NavProvider>
      <Shell />
    </NavProvider>
  )
}
