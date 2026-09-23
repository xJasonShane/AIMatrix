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
}

/** 分类节点：点击固定高亮该分支（再点一次取消），键盘可达 */
export function TreeCategoryNode({ node, active, pinned, delay, dimmed, onHover, onTogglePin }: Props) {
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
    </m.g>
  )
}
