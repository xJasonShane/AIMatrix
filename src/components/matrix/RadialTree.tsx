import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { m } from 'framer-motion'
import { matchesQuery, type NavData } from '../../data/schema'
import { getFavorites, subscribeFavorites } from '../../store/uiPrefs'
import { computeLayout, RING_GAP } from './useRadialLayout'
import { TreeCategoryNode } from './TreeCategoryNode'
import { TreeLinkNode } from './TreeLinkNode'

interface Props {
  data: NavData
  width: number
  height: number
  /** 搜索词（矩阵视图）：命中节点保持高亮与标签，未命中整体压暗，保留树形全貌 */
  query?: string
}

/** 视图缩放边界：0.5x ~ 4x（wheel 缩放与重置共用） */
export const MIN_SCALE = 0.5
export const MAX_SCALE = 4

/** 缩放边界钳制 */
export function clampScale(s: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))
}

/**
 * 以 pivot（指针位置）为不动点计算缩放后的平移量：
 * 缩放前后 pivot 的视口位置不变（pivot * s + t = pivot * s' + t'）。
 */
export function zoomTranslate(
  px: number,
  py: number,
  prevScale: number,
  nextScale: number,
  tx: number,
  ty: number,
): { x: number; y: number } {
  const k = nextScale / prevScale
  return { x: px - (px - tx) * k, y: py - (py - ty) * k }
}

/** 36 齿刻度环的 dasharray 段 */
function tickDashes(r: number, teeth = 36): string {
  const circumference = 2 * Math.PI * r
  const segment = circumference / (teeth * 2)
  return `${segment * 0.45} ${segment * 1.55}`
}

export function RadialTree({ data, width, height, query }: Props) {
  const navigate = useNavigate()
  const layout = useMemo(() => computeLayout(data, width, height), [data, width, height])
  const [hovered, setHovered] = useState<string | null>(null)
  const [pinnedCatId, setPinnedCatId] = useState<string | null>(null)
  const showLinkLabels = width >= 640

  // ---- 视图缩放 / 平移：wheel 缩放（以指针为不动点）+ 鼠标拖拽平移 + 重置 ----
  // 触屏刻意不启用拖拽平移：与叶节点"首 tap 显浮层"的手势冲突（触屏缩放待后续引入双指手势）
  const [view, setView] = useState<{ scale: number; x: number; y: number }>({
    scale: 1,
    x: 0,
    y: 0,
  })
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null)
  const draggedRef = useRef(false)

  // wheel 监听需 passive: false 才能 preventDefault（React 合成 onWheel 默认被动）
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      setView((v) => {
        const next = clampScale(v.scale * Math.exp(-e.deltaY * 0.0015))
        if (next === v.scale) return v
        const t = zoomTranslate(px, py, v.scale, next, v.x, v.y)
        return { scale: next, x: t.x, y: t.y }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const isViewTransformed = view.scale !== 1 || view.x !== 0 || view.y !== 0

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: view.x,
      originY: view.y,
    }
    draggedRef.current = false
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag || e.pointerId !== drag.pointerId) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    // 移动超过阈值视为拖拽：随后触发的 click 一律吞掉，避免平移后误开链接
    if (Math.abs(dx) + Math.abs(dy) > 4) draggedRef.current = true
    setView((v) => ({ ...v, x: drag.originX + dx, y: drag.originY + dy }))
  }
  const onPointerEnd = (e: React.PointerEvent) => {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null
  }

  /** 收藏订阅：星标切换即时反映到浮层（整个树共享一个订阅，避免逐节点注册） */
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getFavorites())
  useEffect(() => subscribeFavorites(() => setFavoriteIds(getFavorites())), [])
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds])

  /** 搜索匹配：按名称/描述/URL/标签过滤（与导航视图一致）；null 表示无查询 */
  const q = query?.trim().toLowerCase() ?? ''
  const matchedLinkIds = useMemo(() => {
    if (!q) return null
    return new Set(
      data.categories.flatMap((c) =>
        c.links
          .filter((l) => matchesQuery(q, l.name, l.description, l.url, ...(l.tags ?? [])))
          .map((l) => l.id),
      ),
    )
  }, [q, data])
  /** 含命中链接的分类集合（分类节点与 root→分类连线的显隐依据） */
  const matchedCatIds = useMemo(() => {
    if (!matchedLinkIds) return null
    return new Set(layout.links.filter((l) => matchedLinkIds.has(l.id)).map((l) => l.categoryId))
  }, [matchedLinkIds, layout])

  /** hover 命中的分类 id：hover 分类本身，或 hover 该分类下的叶节点。
      linkId → categoryId 预建索引 O(1) 反查（替代每次渲染线性 find，与预计算 parent 坐标同一思路） */
  const catIdByLinkId = useMemo(
    () => new Map(layout.links.map((l) => [l.id, l.categoryId])),
    [layout],
  )
  const hoverCatId = hovered?.startsWith('link:')
    ? catIdByLinkId.get(hovered.slice('link:'.length)) ?? null
    : hovered
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
    <>
      <svg
        ref={svgRef}
        className="radial-tree"
        width={width}
        height={height}
        role="group"
        aria-label="AI 工具矩阵树"
        style={{ touchAction: 'none' }}
        onClickCapture={(e) => {
          // 拖拽平移结束后的 click 一律吞掉：避免平移结束时误触发节点点击
          if (draggedRef.current) {
            e.preventDefault()
            e.stopPropagation()
            draggedRef.current = false
          }
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        {/* 背景捕获层：点击空白处清除 hover / 固定高亮（触屏无 mouseleave，靠此复位）。
            置于变换组之外：不随缩放平移移动，始终铺满画布 */}
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

        {/* 变换组：wheel 缩放 + 拖拽平移作用于全部树内容 */}
        <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
      {/* 星图刻度盘底纹：同心虚线参考圆（多环布局时补齐外环参考圆） */}
      <circle className="ref-circle" cx={layout.root.x} cy={layout.root.y} r={layout.radii.cat} />
      <circle className="ref-circle" cx={layout.root.x} cy={layout.root.y} r={layout.radii.link} />
      <circle
        className="ref-circle"
        cx={layout.root.x}
        cy={layout.root.y}
        r={(layout.radii.cat + layout.radii.link) / 2}
        opacity={0.4}
      />
      {Array.from({ length: layout.rings - 1 }, (_, k) => (
        <circle
          key={`ref-outer-${k}`}
          className="ref-circle"
          cx={layout.root.x}
          cy={layout.root.y}
          r={layout.radii.link + (k + 1) * RING_GAP}
          opacity={0.4}
        />
      ))}

      {/* root -> categories */}
      {layout.categories.map((c, i) => (
        <m.path
          key={`e-${c.id}`}
          d={linkPos(layout.root.x, layout.root.y, c.x, c.y)}
          stroke={c.color}
          strokeWidth={activeCatId === c.id ? 2.5 : 1.2}
          fill="none"
          opacity={
            matchedCatIds
              ? matchedCatIds.has(c.id)
                ? 0.65
                : 0.08
              : activeCatId && activeCatId !== c.id
                ? 0.2
                : 0.65
          }
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.15 + i * 0.08 }}
        />
      ))}

      {/* categories -> links */}
      {layout.links.map((l) => {
        const active = activeCatId === l.categoryId
        return (
          <m.path
            key={`e-${l.id}`}
            d={linkPos(l.parent.x, l.parent.y, l.x, l.y)}
            stroke={l.color}
            strokeWidth={active ? 1.8 : 0.9}
            fill="none"
            opacity={
              matchedLinkIds
                ? matchedLinkIds.has(l.id)
                  ? 0.85
                  : 0.06
                : activeCatId && !active
                  ? 0.15
                  : active
                    ? 0.85
                    : 0.5
            }
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
          strokeWidth={6}
          strokeDasharray={tickDashes(56)}
        />
        <circle cx={layout.root.x} cy={layout.root.y} r={34} className="root-ring-circle" />
        <text x={layout.root.x} y={layout.root.y + 4} textAnchor="middle" className="root-label">
          MATRIX
        </text>
      </g>

      {/* category nodes */}
      {layout.categories.map((c, i) => (
        <TreeCategoryNode
          key={c.id}
          node={c}
          delay={i}
          active={activeCatId === c.id}
          pinned={pinnedCatId === c.id}
          dimmed={matchedCatIds ? !matchedCatIds.has(c.id) : false}
          onHover={setHovered}
          onTogglePin={togglePin}
          // 双视图联动：高亮激活的分类节点提供"导航查看"入口（?cat= 参数由导航视图消费）
          onOpenInNav={(id) => navigate(`/nav?cat=${encodeURIComponent(id)}`)}
        />
      ))}

      {/* link nodes */}
      {layout.links.map((l, i) => {
        const active = activeCatId === l.categoryId
        const isHot = hovered === `link:${l.id}`
        // 静态标签与节点本体的显隐/透明度规则（hover 时仅活动分支保持标签；查询命中强制显示）
        const showLabel = !hovered || active
        const matched = matchedLinkIds ? matchedLinkIds.has(l.id) : null
        return (
          <TreeLinkNode
            key={l.id}
            link={l}
            active={active}
            isHot={isHot}
            favorite={favoriteSet.has(l.id)}
            labelVisible={matchedLinkIds ? (matched ?? false) : (showLinkLabels || active) && showLabel}
            nodeOpacity={matchedLinkIds ? (matched ? 1 : 0.12) : showLabel ? 1 : 0.35}
            delay={i}
            canvasWidth={width}
            canvasHeight={height}
            onHover={setHovered}
          />
        )
      })}
        </g>
      </svg>

      {/* 重置视图：仅在缩放/平移偏离初始状态时出现 */}
      {isViewTransformed && (
        <button
          type="button"
          className="view-reset-btn"
          onClick={() => setView({ scale: 1, x: 0, y: 0 })}
          aria-label="重置视图缩放"
          title="重置视图（1:1）"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
            <circle cx="7.5" cy="7.5" r="5.5" />
            <path d="M7.5 0.5v3M7.5 11.5v3M0.5 7.5h3M11.5 7.5h3" />
          </svg>
        </button>
      )}
    </>
  )
}
