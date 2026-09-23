import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { m } from 'framer-motion'
import { matchesQuery, type NavData } from '../../data/schema'
import { getFavorites, subscribeFavorites } from '../../store/uiPrefs'
import { computeLayout } from './useRadialLayout'
import { TreeCategoryNode } from './TreeCategoryNode'
import { TreeLinkNode } from './TreeLinkNode'

interface Props {
  data: NavData
  width: number
  height: number
  /** 搜索词（矩阵视图）：命中节点保持高亮与标签，未命中整体压暗，保留树形全貌 */
  query?: string
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

  /** 收藏订阅：星标切换即时反映到浮层（整个树共享一个订阅，避免逐节点注册） */
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getFavorites())
  useEffect(() => subscribeFavorites(() => setFavoriteIds(getFavorites())), [])
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds])

  /** 搜索匹配：按名称/描述过滤（与导航视图一致）；null 表示无查询 */
  const q = query?.trim().toLowerCase() ?? ''
  const matchedLinkIds = useMemo(() => {
    if (!q) return null
    return new Set(
      data.categories.flatMap((c) =>
        c.links.filter((l) => matchesQuery(q, l.name, l.description)).map((l) => l.id),
      ),
    )
  }, [q, data])
  /** 含命中链接的分类集合（分类节点与 root→分类连线的显隐依据） */
  const matchedCatIds = useMemo(() => {
    if (!matchedLinkIds) return null
    return new Set(layout.links.filter((l) => matchedLinkIds.has(l.id)).map((l) => l.categoryId))
  }, [matchedLinkIds, layout])

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
    </svg>
  )
}
