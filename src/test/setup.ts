import '@testing-library/jest-dom/vitest'

// jsdom 未实现 scrollIntoView：桩化为空实现，命令面板滚动逻辑与测试断言（vi.spyOn）均可正常工作
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
