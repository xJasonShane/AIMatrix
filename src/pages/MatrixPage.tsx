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
      <div className="matrix-vignette" aria-hidden="true" />
      <div className="matrix-overlay">
        <AppHeader view="matrix" />
        <main className="matrix-main">
          <RadialTree data={data} width={size.width} height={size.height} />
          {/* 罗盘角标 */}
          <span
            className="pointer-events-none absolute bottom-5 right-7 flex flex-col items-center font-serif text-[10px] tracking-[2px] text-ink-faint"
            aria-hidden
          >
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="13" cy="13" r="11" strokeDasharray="2 3" />
              <path d="M13 4 L15 13 L13 22 L11 13 Z" fill="currentColor" stroke="none" opacity="0.7" />
            </svg>
            N
          </span>
        </main>
      </div>
    </div>
  )
}
