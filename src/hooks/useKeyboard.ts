import { useEffect, type RefObject } from 'react'

/** 快捷键守卫：输入控件聚焦时不触发（避免劫持正常键入） */
export function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
  )
}

/** GitHub 风格 "/" 快捷键：非输入状态下按下 "/" 聚焦目标搜索框（组合键与输入控件内按键不拦截，交由默认行为） */
export function useFocusOnSlash(target: RefObject<HTMLInputElement>): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
      if (isTypingTarget(e.target)) return
      e.preventDefault()
      target.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [target])
}
