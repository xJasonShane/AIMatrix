import { useMemo, useRef, useState, type MouseEvent } from 'react'
import { m } from 'framer-motion'
import { isValidUrl, type NavData } from '../../data/schema'
import { computeLayout } from './useRadialLayout'
import { pushRecentLink } from '../../store/uiPrefs'

interface Props {
  data: NavData
  width: number
  height: number
}

/** 36 齿刻度环的 dasharray 段 */
function tickDashes(r: number, teeth = 36): string {
  const circumference = 2 * Math.PI * r
  const segment = circumference / (teeth * 2)
  return `${segment * 0.45} ${segment * 1.55}`
}

export function RadialTree({ data, width, height }: Props) {
  const layout = useMemo(() => computeLayout(data, width, height), [data, width, height])
  const [hovered, setHovered] = useState<string | null>(null)
  const [pinnedCatId, setPinnedCatId] = useState<string | null>(null)
  // 触屏支持：记录 tap 时的指针类型与 tap 前的 hover 状态，实现"首 tap 显浮层、再 tap 打开"
  const lastPointerType = useRef('')
  const hoveredBeforeTap = useRef<string | null>(null)
  const showLinkLabels = width >= 640

  /** hover 命中的分类 id：hover 分类本身，或 hover 该分类下的叶节点 */
  const hoverCatId = hovered
    ? hovered.startsWith('link:')
      ? layout.links.find((l) => `link:${l.id}` === hovered)?.categoryId ?? null
      : hovered
    : null
  /** 高亮优先级：hover > 点击固定的分类 */
  const activeCatId = hoverCatId ?? pinnedCatId

  const togglePin = (id: string) =>
    setPinnedCatId((p) => (p === id ? null : id))

  const linkPos = (x1: number, y1: number, x2: number, y2: number) => {
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2
    return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`
  }

  return (
    <svg className="radial-tree" width={width} height={height} role="group" aria-label="AI 工具矩阵树">
      {/* 背景捕获层：点击空白处清除 hover / 固定高亮（触屏无 mouseleave，靠此复位） */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="transparent"
        onClick={() => {
          setHovered(null)
          setPinnedCatId(null)
        }}
      />

      {/* 星图刻度盘底纹：同心虚线参考圆 */}
      <circle className="ref-circle" cx={layout.root.x} cy={layout.root.y} r={layout.radii.cat} />
      <circle className="ref-circle" cx={layout.root.x} cy={layout.root.y} r={layout.radii.link} />
      <circle
        className="ref-circle"
        cx={layout.root.x}
        cy={layout.root.y}
        r={(layout.radii.cat + layout.radii.link) / 2}
        opacity={0.4}
      />

      {/* root -> categories */}
      {layout.categories.map((c, i) => (
        <m.path
          key={`e-${c.id}`}
          d={linkPos(layout.root.x, layout.root.y, c.x, c.y)}
          stroke={c.color}
          strokeWidth={activeCatId === c.id ? 2.5 : 1.2}
          fill="none"
          opacity={activeCatId && activeCatId !== c.id ? 0.2 : 0.65}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.15 + i * 0.08 }}
        />
      ))}

      {/* categories -> links */}
      {layout.links.map((l) => {
        const parent = layout.categories.find((c) => c.id === l.categoryId)!
        const active = activeCatId === l.categoryId
        return (
          <m.path
            key={`e-${l.id}`}
            d={linkPos(parent.x, parent.y, l.x, l.y)}
            stroke={l.color}
            strokeWidth={active ? 1.8 : 0.9}
            fill="none"
            opacity={activeCatId && !active ? 0.15 : active ? 0.85 : 0.5}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.55 }}
          />
        )
      })}

      {/* root node：印章 + 呼吸圈 + 旋转刻度环 */}
      <g className="tree-root">
        <circle cx={layout.root.x} cy={layout.root.y} r={46} className="root-ring pulse" />
        <circle
          cx={layout.root.x}
          cy={layout.root.y}
          r={56}
          className="root-ticks"
          fill="none"
          stroke="var(--color-line)"
          strokeWidth="6"
          strokeDasharray={tickDashes(56)}
        />
        <circle cx={layout.root.x} cy={layout.root.y} r={34} className="root-ring-circle" />
        <text x={layout.root.x} y={layout.root.y + 4} textAnchor="middle" className="root-label">
          MATRIX
        </text>
      </g>

      {/* category nodes：点击固定高亮该分支（再点一次取消），键盘可达 */}
      {layout.categories.map((c, i) => (
        <m.g
          key={c.id}
          className={`tree-cat${activeCatId === c.id ? ' active' : ''}`}
          onMouseEnter={() => setHovered(c.id)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => togglePin(c.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              togglePin(c.id)
            }
          }}
          role="button"
          tabIndex={0}
          aria-pressed={pinnedCatId === c.id}
          aria-label={`固定高亮分类：${c.name}`}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.35 + i * 0.1 }}
          style={{ transformOrigin: `${c.x}px ${c.y}px`, cursor: 'pointer' }}
        >
          <circle cx={c.x} cy={c.y} r={9} fill={c.color} />
          <circle cx={c.x} cy={c.y} r={15} fill="none" stroke={c.color} strokeWidth={1} opacity={0.5} />
          <text x={c.x} y={c.y - 24} textAnchor="middle" className="cat-label" fill={c.color}>
            {c.name}
          </text>
        </m.g>
      ))}

      {/* link nodes + hover 浮层 */}
      {layout.links.map((l, i) => {
        const active = activeCatId === l.categoryId
        const showLabel = !hovered || active
        const isHot = hovered === `link:${l.id}`
        const valid = isValidUrl(l.url)
        const flip = Math.cos(l.angle) < -0.15 // 左半圆向左展开
        const popW = 190
        const popH = 60
        // 浮层钳制在画布内，避免顶部/底部/右侧被裁剪
        const popX = Math.min(Math.max(flip ? l.x - 16 - popW : l.x + 16, 8), width - popW - 8)
        const popY = Math.min(Math.max(l.y - 30, 8), height - popH - 8)
        const nodeInner = (
          <>
            <title>{l.name}</title>
            <circle cx={l.x} cy={l.y} r={10} fill={l.color} className="link-node-glow" opacity={0} />
            <circle cx={l.x} cy={l.y} r={5} className="link-node-circle" stroke={l.color} strokeWidth={2} />
            {/* 移动端（<640px）默认无标签，但活动/固定分支仍显示，保证触屏可用 */}
            {(showLinkLabels || active) && showLabel && !isHot && (
              <text
                x={l.x + Math.cos(l.angle) * 14}
                y={l.y + Math.sin(l.angle) * 14 + 4}
                textAnchor={flip ? 'end' : Math.cos(l.angle) > 0.15 ? 'start' : 'middle'}
                className="link-label"
                fill={active ? '#2b2620' : '#6f6455'}
              >
                {l.name}
              </text>
            )}
          </>
        )
        const nodeHandlers = {
          onPointerDown: (e: { pointerType: string }) => {
            lastPointerType.current = e.pointerType
            hoveredBeforeTap.current = hovered
          },
          onMouseEnter: () => setHovered(`link:${l.id}`),
          onMouseLeave: () => setHovered(null),
          onFocus: () => setHovered(`link:${l.id}`),
          onBlur: () => setHovered(null),
        }
        /** 触屏首次 tap 仅显示浮层（阻止跳转），浮层已显示时再 tap 才打开链接 */
        const handleClick = (e: MouseEvent) => {
          const isTouch = lastPointerType.current === 'touch'
          lastPointerType.current = ''
          if (isTouch && hoveredBeforeTap.current !== `link:${l.id}`) {
            e.preventDefault()
            setHovered(`link:${l.id}`)
            return
          }
          pushRecentLink(l.id)
        }
        const nodeAnim = {
          initial: { opacity: 0, scale: 0.3 },
          animate: { opacity: showLabel ? 1 : 0.35, scale: 1 },
          transition: { duration: 0.4, delay: 0.7 + i * 0.05 },
          style: { transformOrigin: `${l.x}px ${l.y}px`, cursor: valid ? 'pointer' : 'not-allowed' },
        }
        return (
          <m.g key={l.id}>
            {valid ? (
              <m.a
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="tree-link-node"
                {...nodeHandlers}
                {...nodeAnim}
                onClick={handleClick}
              >
                {nodeInner}
              </m.a>
            ) : (
              // 非法 URL：渲染为禁用节点，不可点击（与导航卡片行为一致）
              <m.g className="tree-link-node disabled" aria-disabled="true" {...nodeHandlers} {...nodeAnim}>
                {nodeInner}
              </m.g>
            )}

            {/* hover / focus 浮层 */}
            {isHot && (
              <m.g
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: 0.15 }}
                style={{ pointerEvents: 'none' }}
              >
                <rect
                  x={popX}
                  y={popY}
                  width={popW}
                  rx={10}
                  ry={10}
                  height={popH}
                  fill="var(--color-paper-raised)"
                  stroke="var(--color-line)"
                  strokeWidth={1}
                  filter="drop-shadow(0 6px 12px rgba(80,60,30,0.28))"
                />
                <rect x={popX} y={popY} width={4} height={popH} rx={2} fill={l.color} opacity={0.6} />
                <text
                  x={popX + 14}
                  y={popY + 20}
                  className="cat-label"
                  fill="var(--color-ink)"
                  style={{ fontSize: 13 }}
                >
                  {l.name.length > 16 ? `${l.name.slice(0, 15)}…` : l.name}
                </text>
                <text
                  x={popX + 14}
                  y={popY + 37}
                  className="link-label"
                  fill="var(--color-ink-soft)"
                  style={{ fontSize: 10.5 }}
                >
                  {l.description
                    ? l.description.length > 24
                      ? `${l.description.slice(0, 23)}…`
                      : l.description
                    : ' '}
                </text>
                <text
                  x={popX + 14}
                  y={popY + 53}
                  className="link-label"
                  fill="var(--color-accent)"
                  style={{ fontSize: 10.5, fontWeight: 600 }}
                >
                  {valid ? '打开 ↗' : 'URL 非法 · 已禁用'}
                </text>
              </m.g>
            )}
          </m.g>
        )
      })}
    </svg>
  )
}
