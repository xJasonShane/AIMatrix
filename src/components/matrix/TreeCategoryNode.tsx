import { m } from 'framer-motion'
import type { LayoutNode } from './useRadialLayout'

interface Props {
  node: LayoutNode
  active: boolean
  pinned: boolean
  delay: number
  /** 搜索未命中时压暗（保留树形全貌） */
  dimmed: boolean
  onHover: (id: string | null) => void
  onTogglePin: (id: string) => void
  /** 高亮激活（hover/固定）时显示"在导航中查看"入口，点击跳转 /nav?cat=<id> */
  onOpenInNav?: (id: string) => void
}

/** 分类节点：点击固定高亮该分支（再点一次取消），键盘可达；激活时提供跳转导航视图入口 */
export function TreeCategoryNode({ node, active, pinned, delay, dimmed, onHover, onTogglePin, onOpenInNav }: Props) {
  return (
    <m.g
      className={`tree-cat${active ? ' active' : ''}`}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onTogglePin(node.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onTogglePin(node.id)
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={pinned}
      aria-label={`固定高亮分类：${node.name}`}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: dimmed ? 0.15 : 1, scale: 1 }}
      transition={{ duration: 0.45, delay: 0.35 + delay * 0.1 }}
      style={{ transformOrigin: `${node.x}px ${node.y}px`, cursor: 'pointer' }}
    >
      <circle cx={node.x} cy={node.y} r={9} fill={node.color} />
      <circle cx={node.x} cy={node.y} r={15} fill="none" stroke={node.color} strokeWidth={1} opacity={0.5} />
      <text x={node.x} y={node.y - 24} textAnchor="middle" className="cat-label" fill={node.color}>
        {node.name}
      </text>
      {/* 激活（hover / 固定）时出现的联动入口：跳转导航视图对应分类。
          置于节点 g 内部以延续 hover 状态；stopPropagation 避免触发节点的固定/取消逻辑 */}
      {active && onOpenInNav && (
        <g
          role="button"
          tabIndex={0}
          aria-label={`在导航视图中查看分类：${node.name}`}
          onClick={(e) => {
            e.stopPropagation()
            onOpenInNav(node.id)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
              onOpenInNav(node.id)
            }
          }}
          style={{ pointerEvents: 'auto', cursor: 'pointer' }}
        >
          <rect
            x={node.x - 52}
            y={node.y + 22}
            width={104}
            height={24}
            rx={12}
            fill="var(--color-paper-raised)"
            stroke="var(--color-line)"
            strokeWidth={1}
          />
          <text x={node.x} y={node.y + 38} textAnchor="middle" className="cat-nav-link">
            导航查看 →
          </text>
        </g>
      )}
    </m.g>
  )
}
