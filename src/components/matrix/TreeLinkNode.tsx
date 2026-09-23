import { useRef, type MouseEvent } from 'react'
import { m } from 'framer-motion'
import { isValidUrl } from '../../data/schema'
import type { LayoutLink } from './useRadialLayout'
import { pushRecentLink, toggleFavorite } from '../../store/uiPrefs'
import { STAR_ICON_D } from '../nav/LinkCard'

interface Props {
  link: LayoutLink
  /** 所属分类处于 hover/固定高亮中 */
  active: boolean
  /** 自身被 hover/focus：显示信息浮层 */
  isHot: boolean
  /** 是否已收藏（浮层星标实心与否；状态由 RadialTree 统一订阅下发） */
  favorite: boolean
  /** 静态标签是否渲染（宽屏/活动分支/查询命中规则由父组件计算） */
  labelVisible: boolean
  /** 节点本体不透明度（查询未命中时压暗） */
  nodeOpacity: number
  delay: number
  canvasWidth: number
  canvasHeight: number
  onHover: (id: string | null) => void
}

/** 叶节点：hover/focus 浮现信息浮层；触屏"首 tap 显浮层、再 tap 打开"；非法 URL 渲染禁用态 */
export function TreeLinkNode({
  link,
  active,
  isHot,
  favorite,
  labelVisible,
  nodeOpacity,
  delay,
  canvasWidth,
  canvasHeight,
  onHover,
}: Props) {
  const valid = isValidUrl(link.url)
  // 触屏支持：记录 tap 时的指针类型与 tap 前的 hover 状态（每节点独立，避免跨节点串扰）
  const lastPointerType = useRef('')
  const hotBeforeTap = useRef(false)
  const flip = Math.cos(link.angle) < -0.15 // 左半圆向左展开
  const popW = 190
  const popH = 60
  // 浮层钳制在画布内，避免顶部/底部/右侧被裁剪
  const popX = Math.min(Math.max(flip ? link.x - 16 - popW : link.x + 16, 8), canvasWidth - popW - 8)
  const popY = Math.min(Math.max(link.y - 30, 8), canvasHeight - popH - 8)

  const nodeInner = (
    <>
      <title>{link.name}</title>
      <circle cx={link.x} cy={link.y} r={10} fill={link.color} className="link-node-glow" opacity={0} />
      <circle cx={link.x} cy={link.y} r={5} className="link-node-circle" stroke={link.color} strokeWidth={2} />
      {/* 移动端（<640px）默认无标签，但活动/固定/查询命中分支仍显示，保证触屏可用 */}
      {labelVisible && !isHot && (
        <text
          x={link.x + Math.cos(link.angle) * 14}
          y={link.y + Math.sin(link.angle) * 14 + 4}
          textAnchor={flip ? 'end' : Math.cos(link.angle) > 0.15 ? 'start' : 'middle'}
          className="link-label"
          fill={active ? 'var(--color-ink)' : 'var(--color-ink-soft)'}
        >
          {link.name}
        </text>
      )}
    </>
  )

  const nodeHandlers = {
    onPointerDown: (e: { pointerType: string }) => {
      lastPointerType.current = e.pointerType
      hotBeforeTap.current = isHot
    },
    onMouseEnter: () => onHover(`link:${link.id}`),
    onMouseLeave: () => onHover(null),
    onFocus: () => onHover(`link:${link.id}`),
    onBlur: () => onHover(null),
  }

  /** 触屏首次 tap 仅显示浮层（阻止跳转），浮层已显示时再 tap 才打开链接 */
  const handleClick = (e: MouseEvent) => {
    const isTouch = lastPointerType.current === 'touch'
    lastPointerType.current = ''
    if (isTouch && !hotBeforeTap.current) {
      e.preventDefault()
      onHover(`link:${link.id}`)
      return
    }
    pushRecentLink(link.id)
  }

  const nodeAnim = {
    initial: { opacity: 0, scale: 0.3 },
    animate: { opacity: nodeOpacity, scale: 1 },
    transition: { duration: 0.4, delay: 0.7 + delay * 0.05 },
    style: { transformOrigin: `${link.x}px ${link.y}px`, cursor: valid ? 'pointer' : 'not-allowed' },
  }

  return (
    <m.g key={link.id}>
      {valid ? (
        <m.a
          href={link.url}
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
            filter="drop-shadow(0 6px 14px rgba(30,60,52,0.22))"
          />
          <rect x={popX} y={popY} width={4} height={popH} rx={2} fill={link.color} opacity={0.6} />
          <text
            x={popX + 14}
            y={popY + 20}
            className="cat-label"
            fill="var(--color-ink)"
            style={{ fontSize: 13 }}
          >
            {link.name.length > 16 ? `${link.name.slice(0, 15)}…` : link.name}
          </text>
          <text
            x={popX + 14}
            y={popY + 37}
            className="link-label"
            fill="var(--color-ink-soft)"
            style={{ fontSize: 10.5 }}
          >
            {link.description
              ? link.description.length > 24
                ? `${link.description.slice(0, 23)}…`
                : link.description
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
          {/* 收藏星标（仅合法 URL）：置于"打开 ↗"行右侧；显式 pointerEvents:auto 覆盖浮层的 none 继承，
              点击不冒泡到节点 <a>；键盘用户经导航卡片星标操作（浮层本身仅 hover/focus 临时存在） */}
          {valid && (
            <g
              className="pop-star"
              role="button"
              aria-label={favorite ? '取消收藏' : '收藏'}
              onClick={(e) => {
                e.stopPropagation()
                toggleFavorite(link.id)
              }}
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
            >
              <title>{favorite ? '取消收藏' : '收藏'}</title>
              <circle cx={popX + popW - 18} cy={popY + 48} r={13} fill="transparent" />
              <path
                transform={`translate(${popX + popW - 26} ${popY + 40}) scale(0.66)`}
                d={STAR_ICON_D}
                fill={favorite ? 'var(--color-accent)' : 'none'}
                stroke={favorite ? 'var(--color-accent)' : 'var(--color-ink-faint)'}
                strokeWidth={2}
                strokeLinejoin="round"
              />
            </g>
          )}
        </m.g>
      )}
    </m.g>
  )
}
