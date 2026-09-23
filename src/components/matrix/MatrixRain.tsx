import { useEffect, useRef, useState } from 'react'

export const COLUMN_WIDTH = 14
/** 动画帧率上限：代码雨对帧率不敏感，30fps 可显著降低高刷屏上的 GPU/电量开销 */
export const FRAME_MIN_INTERVAL = 1000 / 30
const GLYPHS = 'アイウエオカキクケコサシスセソ0123456789ABCDEF<>{}/*+=$#'

export function columnCount(width: number, colWidth = COLUMN_WIDTH): number {
  // ceil so the last partial column still fills the width (plan test: 147/14 -> 11)
  return Math.max(0, Math.ceil(width / colWidth))
}

/** 距上一帧达到最小间隔才重绘（rAF 全速回调下的绘制节流判定） */
export function shouldRedraw(lastDraw: number, now: number, min = FRAME_MIN_INTERVAL): boolean {
  return now - lastDraw >= min
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // 订阅系统减弱动效偏好：运行时切换即时生效，与 MotionConfig reducedMotion="user" 行为对齐
  const [prefersReduced, setPrefersReduced] = useState(prefersReducedMotion)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setPrefersReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let cols = 0
    let drops: number[] = []
    let raf = 0
    let running = true
    // Declared BEFORE the if/else below (plan's noted fix for use-before-declare).
    let cleanupVisibility = () => {}

    const resize = () => {
      // dpr 每次重算：窗口跨屏拖动到不同缩放比的显示器时正确适配
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = columnCount(w)
      drops = Array.from({ length: cols }, () => Math.random() * -40)
      // 重设画布尺寸会清空内容，降级模式下需立即重绘静态点阵
      if (prefersReduced) drawStatic()
    }

    const drawStatic = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      ctx.font = '13px monospace'
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < 40; j++) {
          if (Math.random() > 0.92) {
            ctx.fillStyle = 'rgba(90,70,45,0.22)'
            ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], i * COLUMN_WIDTH, j * 16)
          }
        }
      }
    }

    // 绘制节流：rAF 按显示器刷新率触发（120Hz+ 时开销翻倍），仅达到 30fps 间隔才实际绘制
    let lastDraw = 0
    const tick = (now: number) => {
      if (!running) return
      if (shouldRedraw(lastDraw, now)) {
        lastDraw = now
        // trail fade — translucent paper color, old strokes "dry away"
        ctx.fillStyle = 'rgba(247, 239, 217, 0.08)'
        ctx.fillRect(0, 0, window.innerWidth, window.innerHeight)
        ctx.font = '13px monospace'
        for (let i = 0; i < cols; i++) {
          const glyph = GLYPHS[(Math.random() * GLYPHS.length) | 0]
          const y = drops[i] * 16
          ctx.fillStyle = 'rgba(90, 70, 45, 0.75)'
          ctx.fillText(glyph, i * COLUMN_WIDTH, y)
          ctx.fillStyle = 'rgba(90, 70, 45, 0.3)'
          ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], i * COLUMN_WIDTH, y - 16)
          if (y > window.innerHeight && Math.random() > 0.975) drops[i] = 0
          drops[i] += 1
        }
      }
      raf = requestAnimationFrame(tick)
    }

    // rAF 合并：同一帧内的连续 resize 事件只执行一次重设（与 MatrixPage 尺寸测量节流同一模式）
    let resizeFrame = 0
    const onResize = () => {
      if (resizeFrame) return
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0
        resize()
      })
    }

    resize()
    window.addEventListener('resize', onResize)

    if (prefersReduced) {
      drawStatic()
    } else {
      const onVisibility = () => {
        if (document.hidden) {
          running = false
          cancelAnimationFrame(raf)
        } else if (!running) {
          running = true
          raf = requestAnimationFrame(tick)
        }
      }
      document.addEventListener('visibilitychange', onVisibility)
      raf = requestAnimationFrame(tick)
      // remove the visibilitychange listener on unmount
      cleanupVisibility = () => document.removeEventListener('visibilitychange', onVisibility)
    }

    return () => {
      running = false
      cancelAnimationFrame(raf)
      cancelAnimationFrame(resizeFrame)
      window.removeEventListener('resize', onResize)
      cleanupVisibility()
    }
  }, [prefersReduced])

  return <canvas ref={canvasRef} className="matrix-rain" aria-hidden="true" />
}
