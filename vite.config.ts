/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // 相对路径 base：配合 HashRouter 可直接部署到 GitHub Pages 子路径或任意静态服务器
  base: './',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    // 单测只收集 src/（e2e/ 下的 Playwright 用例由 playwright.config.ts 管理）
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
