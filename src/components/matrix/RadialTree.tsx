import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { NavData } from '../../data/schema'
import { computeLayout } from './useRadialLayout'

interface Props {
  data: NavData
  width: number
  height: number
}

export function RadialTree({ data, width, height }: Props) {
  const layout = useMemo(() => computeLayout(data, width, height), [data, width, height])
  const [hovered, setHovered] = useState<string | null>(null)
  const showLinkLabels = width >= 640

  const linkPos = (x1: number, y1: number, x2: number, y2: number) => {
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2
    return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`
  }

  return (
    <svg className="radial-tree" width={width} height={height} role="img" aria-label="AI 工具矩阵树">
      {/* root -> categories */}
      {layout.categories.map((c, i) => (
        <motion.path
          key={`e-${c.id}`}
          d={linkPos(layout.root.x, layout.root.y, c.x, c.y)}
          stroke={c.color}
          strokeWidth={hovered === c.id ? 2.5 : 1.2}
          fill="none"
          opacity={hovered && hovered !== c.id ? 0.12 : 0.5}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.15 + i * 0.08 }}
        />
      ))}

      {/* categories -> links */}
      {layout.links.map((l) => {
        const parent = layout.categories.find((c) => c.id === l.categoryId)!
        const active = hovered === l.categoryId
        return (
          <motion.path
            key={`e-${l.id}`}
            d={linkPos(parent.x, parent.y, l.x, l.y)}
            stroke={l.color}
            strokeWidth={active ? 1.8 : 0.9}
            fill="none"
            opacity={hovered && !active ? 0.08 : active ? 0.75 : 0.35}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.55 }}
          />
        )
      })}

      {/* root node */}
      <g className="tree-root">
        <circle cx={layout.root.x} cy={layout.root.y} r={46} className="root-ring pulse" />
        <circle cx={layout.root.x} cy={layout.root.y} r={34} fill="#04120a" stroke="#00ff41" strokeWidth={1.5} />
        <text x={layout.root.x} y={layout.root.y + 4} textAnchor="middle" className="root-label">MATRIX</text>
      </g>

      {/* category nodes */}
      {layout.categories.map((c, i) => (
        <motion.g
          key={c.id}
          className={`tree-cat${hovered === c.id ? ' active' : ''}`}
          onMouseEnter={() => setHovered(c.id)}
          onMouseLeave={() => setHovered(null)}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.35 + i * 0.1 }}
          style={{ transformOrigin: `${c.x}px ${c.y}px`, cursor: 'pointer' }}
        >
          <circle cx={c.x} cy={c.y} r={9} fill={c.color} />
          <circle cx={c.x} cy={c.y} r={15} fill="none" stroke={c.color} strokeWidth={1} opacity={0.5} />
          <text x={c.x} y={c.y - 24} textAnchor="middle" className="cat-label" fill={c.color}>{c.name}</text>
        </motion.g>
      ))}

      {/* link nodes */}
      {layout.links.map((l, i) => {
        const active = hovered === l.categoryId
        const showLabel = !hovered || active
        return (
          <motion.a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noreferrer"
            className="tree-link-node"
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: showLabel ? 1 : 0.35, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.7 + i * 0.05 }}
            style={{ transformOrigin: `${l.x}px ${l.y}px`, cursor: 'pointer' }}
          >
            <title>{l.name}</title>
            <circle cx={l.x} cy={l.y} r={5} fill="#0a0e12" stroke={l.color} strokeWidth={2} />
            {showLinkLabels && showLabel && (
              <text
                x={l.x + Math.cos(l.angle) * 14}
                y={l.y + Math.sin(l.angle) * 14 + 4}
                textAnchor={Math.cos(l.angle) > 0.1 ? 'start' : Math.cos(l.angle) < -0.1 ? 'end' : 'middle'}
                className="link-label"
                fill={active ? '#eaf2f7' : '#8fa1ad'}
              >
                {l.name}
              </text>
            )}
          </motion.a>
        )
      })}
    </svg>
  )
}
