export function DataError({ message }: { message: string }) {
  return (
    <div
      className="mx-auto my-20 max-w-[720px] -rotate-[0.4deg] rounded border-2 border-dashed border-accent bg-paper-raised px-7 py-6 shadow-[0_4px_14px_-8px_rgba(80,60,30,0.4)]"
      role="alert"
    >
      <h1 className="mt-0 font-serif text-xl font-bold text-accent">navigation.json 数据无效</h1>
      <pre className="whitespace-pre-wrap font-mono text-[13px] text-ink-soft">{message}</pre>
      <p className="text-ink-soft">
        请修复 <code className="font-mono text-accent">src/data/navigation.json</code> 后重新构建。
      </p>
    </div>
  )
}
