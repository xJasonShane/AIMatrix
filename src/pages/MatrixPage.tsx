import { useEffect, useState } from 'react'
import { AppHeader } from '../components/shared/AppHeader'
import { MatrixRain } from '../components/matrix/MatrixRain'
import { RadialTree } from '../components/matrix/RadialTree'
import { useNav } from '../store/useNavStore'

export function MatrixPage() {
  const { data } = useNav()
  const [size, setSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight - 70,
  }))

  useEffect(() => {
    let t: number | undefined
    const onResize = () => {
      window.clearTimeout(t)
      t = window.setTimeout(() => {
        setSize({ width: window.innerWidth, height: window.innerHeight - 70 })
      }, 150)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.clearTimeout(t)
    }
  }, [])

  return (
    <div className="page page-matrix">
      <MatrixRain />
      <div className="matrix-overlay">
        <AppHeader view="matrix" />
        <main className="matrix-main">
          <RadialTree data={data} width={size.width} height={size.height} />
        </main>
      </div>
    </div>
  )
}
