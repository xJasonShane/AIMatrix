import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * 视图级错误边界：视图渲染期异常不再白屏整站。
 * 在 App 中包裹于按路由 key 重挂载的容器内——切换视图自动复位；
 * 回退卡片提供"重试"（复位边界重新渲染）与"返回导航视图"（逃逸到另一视图）两个出口。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // 保留现场供控制台排查；UI 层由回退卡片接管
    console.error('[ErrorBoundary] 视图渲染崩溃', error, info.componentStack)
  }

  private retry = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div
        role="alert"
        className="mx-auto my-20 max-w-[720px] rounded-xl border-2 border-dashed border-accent bg-paper-raised px-7 py-6 shadow-[0_4px_16px_-8px_rgba(30,60,52,0.25)]"
      >
        <h1 className="mt-0 font-serif text-xl font-bold text-accent">页面渲染出错</h1>
        <pre className="whitespace-pre-wrap font-mono text-[13px] text-ink-soft">
          {error.message}
        </pre>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={this.retry}
            className="cursor-pointer rounded-full border border-line bg-paper-raised px-4 py-1.5 font-mono text-xs text-ink-soft transition-colors hover:border-accent hover:text-accent"
          >
            重试
          </button>
          <Link to="/nav" className="font-mono text-xs text-accent hover:underline">
            返回导航视图 →
          </Link>
        </div>
      </div>
    )
  }
}
