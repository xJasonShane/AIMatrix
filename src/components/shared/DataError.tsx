export function DataError({ message }: { message: string }) {
  return (
    <div className="data-error" role="alert">
      <h1>navigation.json 数据无效</h1>
      <pre>{message}</pre>
      <p>请修复 <code>src/data/navigation.json</code> 后重新构建。</p>
    </div>
  )
}
