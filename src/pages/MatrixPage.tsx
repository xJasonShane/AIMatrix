import { useEffect, useRef, useState } from 'react'
import { AppHeader } from '../components/shared/AppHeader'
import { MatrixRain } from '../components/matrix/MatrixRain'
import { RadialTree } from '../components/matrix/RadialTree'
import { useNav } from '../store/useNavStore'

export function MatrixPage() {
  const { data } = useNav()
  const mainRef = useRef<HTMLElement>(null)
  // 直接实测内容区尺寸，自动适配页头实际高度（无需硬编码偏移量）
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== 'undefined' && document.fullscreenElement != null,
  )

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setSize({ width: el.clientWidth, height: el.clientHeight })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const onFs = () => setIsFullscreen(document.fullscreenElement != null)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void document.documentElement.requestFullscreen().catch(() => {})
    }
  }

  return (
    <div className="page page-matrix">
      <MatrixRain />
      <div className="matrix-vignette" aria-hidden="true" />
      <div className="matrix-overlay">
        <AppHeader view="matrix" />
        <main className="matrix-main" ref={mainRef}>
          {size && <RadialTree data={data} width={size.width} height={size.height} />}
          <button
            type="button"
            className="fullscreen-btn"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? '退出全屏' : '进入全屏'}
            title={isFullscreen ? '退出全屏' : '进入全屏'}
          >
            {isFullscreen ? (
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                <path d="M5.5 1.5v4h-4M9.5 13.5v-4h4" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                <path d="M1.5 5.5v-4h4M13.5 9.5v4h-4" />
              </svg>
            )}
          </button>
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
