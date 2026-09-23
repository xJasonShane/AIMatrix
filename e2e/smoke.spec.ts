import { test, expect } from '@playwright/test'

test.describe('AI Matrix smoke', () => {
  test('renders nav cards and switches to the matrix view', async ({ page }) => {
    await page.goto('/')
    // HashRouter：未知路径重定向到 /#/nav
    await expect(page).toHaveURL(/#\/nav$/)
    const cards = page.locator('a.link-card')
    await expect(cards.first()).toBeVisible()
    expect(await cards.count()).toBeGreaterThan(0)

    // 视图切换到矩阵（exact 避开 footer 的"进入矩阵视图 →"链接）
    await page.getByRole('link', { name: '矩阵', exact: true }).click()
    await expect(page).toHaveURL(/#\/matrix$/)
    await expect(page.getByRole('group', { name: 'AI 工具矩阵树' })).toBeVisible()
    await expect(page.locator('svg.radial-tree')).toBeVisible()
  })

  test('opens the command palette with Ctrl+K and runs an action', async ({ page }) => {
    await page.goto('/')
    // 等待 React 挂载（快捷键监听器就绪）后再按键
    await expect(page.locator('a.link-card').first()).toBeVisible()
    await page.keyboard.press('Control+k')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    // 过滤并执行"矩阵视图"动作
    await page.getByRole('combobox').fill('矩阵')
    await page.keyboard.press('Enter')
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/#\/matrix$/)
  })

  test('focuses the nav search box with the / shortcut', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('a.link-card').first()).toBeVisible()
    await page.keyboard.press('/')
    await expect(page.getByPlaceholder('搜索工具名称或描述…')).toBeFocused()
  })

  test('filters matrix nodes by the matrix search and shows a no-match hint', async ({ page }) => {
    await page.goto('/#/matrix')
    const search = page.getByPlaceholder('搜索矩阵节点…')
    await expect(search).toBeVisible()

    // 命中：节点标签保持可见
    await search.fill('chatgpt')
    await expect(page.locator('.link-label', { hasText: 'ChatGPT' }).first()).toBeVisible()
    await expect(page.getByRole('status')).toHaveCount(0)

    // 未命中：空态提示出现；Esc 清空
    await search.fill('zzz 不存在')
    await expect(page.getByRole('status')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('status')).toHaveCount(0)
  })

  test('bulk collapses all nav categories and restores them', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '全部收起' }).click()
    await expect(page.getByRole('button', { name: '对话助手', expanded: false })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    await page.getByRole('button', { name: '全部展开' }).click()
    await expect(page.getByRole('button', { name: '对话助手' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })
})
