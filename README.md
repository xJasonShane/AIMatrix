# AI Matrix

个人 AI 矩阵导航站 —— 一个维护常用 AI 工具 / 网站 / 平台链接的纯静态 Web 应用，可在**导航视图**与**矩阵视图**之间切换：

- **导航视图**（`/nav`）：按分类纵向排列的链接卡片网格，支持折叠/展开、悬停高亮，暗色 + 矩阵绿视觉基调。
- **矩阵视图**（`/matrix`）：黑客帝国主题的径向矩阵树 —— 全屏 Canvas 代码雨背景 + 居中发光根节点，分类与链接逐环展开（SVG 贝塞尔连线，入场 stagger 生长动画），点击叶子节点直接访问目标网站。

## 技术栈

| 方面 | 选择 |
| --- | --- |
| 框架 | React 18 + TypeScript + Vite |
| 路由 | react-router-dom（`/nav`、`/matrix`） |
| 动画 | Framer Motion |
| 矩阵雨 | 原生 Canvas（无重型依赖） |
| 样式 | Tailwind CSS v4 |
| 测试 | Vitest + React Testing Library |
| 数据源 | `public/data/navigation.json`（运行时 fetch，替换即生效，无需重新构建） |
| 持久化 | localStorage 仅存 UI 偏好 |

## 快速开始

```bash
# 安装依赖
npm install

# 本地开发（默认 http://localhost:5173）
npm run dev

# 运行单元测试
npm test

# 生产构建（产出纯静态站点，可部署 GitHub Pages / Vercel / 任意静态服务器）
npm run build

# 本地预览构建产物
npm run preview
```

## 如何维护导航数据

站点不提供站内增删改，日常只需编辑唯一的数据文件 [public/data/navigation.json](public/data/navigation.json)（页面运行时加载，部署后替换该文件并刷新即可生效）：

```jsonc
{
  "categories": [
    {
      "id": "chat",                  // 唯一 id（React key / 树布局定位 / 去重校验）
      "name": "对话助手",
      "color": "#00ff41",            // 可选，矩阵视图分支颜色
      "links": [
        {
          "id": "gpt",
          "name": "ChatGPT",
          "url": "https://chatgpt.com",   // 必须以 http(s):// 开头
          "description": "OpenAI 对话助手",
          "tags": ["openai", "chat"],   // 可选，检索关键词（不展示，参与全站搜索，最多 8 个）
          "icon": "./icons/gpt.svg"     // 可选，http(s) 地址或站内相对路径；非法/加载失败降级为首字母色块
        }
      ]
    }
  ]
}
```

- `tags` / `icon` 为可选字段，缺省或非法值自动降级（tags 不生效、icon 回落首字母色块），不会报错。
- 数据格式错误、缺字段、重复 id 或非法 URL 时，构建/运行会抛出带字段路径的错误（如 `categories[2].links[0].url 缺失`）；生产环境下显示全屏错误占位页而非白屏。
- 组件不允许直接 import JSON，只能通过 `useNavStore` 获取数据；将来更换数据源（API、IndexedDB）只需修改 store 一处。

## 项目结构

```
src/
  data/
    navigation.json        # 唯一的数据文件，日常只改这里
    schema.ts              # 数据类型定义与运行时校验、扇区角度分配算法
  store/
    useNavStore.tsx        # 读取 JSON → 规范化内存态（Context + useMemo）
    uiPrefs.ts             # localStorage 偏好读写（隐私模式自动降级内存）
  components/
    nav/                   # 导航视图组件（分类区块、链接卡片）
    matrix/                # 矩阵视图组件（代码雨、径向树、布局 hook）
    shared/                # 两视图共用（页头、错误占位）
  pages/
    NavPage.tsx            # /nav 导航视图
    MatrixPage.tsx         # /matrix 矩阵视图
  test/
    setup.ts               # Vitest 测试环境配置
```

## 特性细节

- **性能**：矩阵雨 30fps 绘制节流、`devicePixelRatio` 适配，页面不可见时暂停，`prefers-reduced-motion` 时降级为静止点阵，切走视图即卸载。
- **响应式**：卡片网格 `auto-fill / minmax(240px, 1fr)`；径向树半径自适应窗口尺寸与节点数，resize 防抖重算；叶节点密集时自动扩展多环交错分布，防止标签重叠。
- **矩阵视图缩放平移**：滚轮以指针为不动点缩放（0.5x~4x）、鼠标拖拽平移，视图偏离初始状态时出现一键重置按钮。
- **可访问性**：键盘焦点描边、`reducedMotion` 遵循系统设置（运行时切换即时生效）。
- **键盘快捷键**：`Ctrl/Cmd+K` 命令面板、`/` 聚焦搜索框（导航/矩阵视图均支持）、`g n` / `g m` 切换视图（GitHub 风格序列键）、`?` 查看快捷键帮助。
- **搜索**：导航视图按名称/描述/URL（含域名）/标签即时过滤；矩阵视图顶部搜索条按同规则命中高亮、未命中压暗，`Esc` 清空；命令面板按同规则匹配，收藏与最近使用的链接优先排序，命中子串高亮。
- **双视图联动**：矩阵视图分类节点 hover / 固定高亮时提供「导航查看」入口，跳转 `/nav?cat=<id>` 滚动定位并短暂高亮对应分类（链接可分享直达）。
- **批量操作**：导航页"全部收起 / 全部展开"一次性切换全部分类（状态持久化）；卡片 hover 显示复制 URL 按钮（不跳转、不计入最近使用）。
- **本地备份**：页脚「备份 / 导入」将收藏与最近使用导出为 JSON 文本（复制保存），或粘贴恢复；导入自动过滤数据中已失效的条目，纯本地无网络请求。
- **PWA**：`public/manifest.webmanifest` 支持将站点添加到主屏幕 / 独立窗口打开（纯静态，无需 Service Worker）。
- **健壮性**：localStorage 不可用（隐私模式）时自动降级为内存存储；非法分类色自动回落默认色。
- **质量门禁**：CI 依次执行 lint → 单元测试 → 数据校验 → 构建 → 包体积守卫（JS gzip ≤ 300 kB）→ E2E smoke（Playwright，构建产物上跑关键路径）；依赖更新由 Dependabot 每周自动发起。
- **本地 E2E**：`npm run test:e2e`（自动构建并启动 preview，跑 `e2e/` 下用例）。

## 设计文档

完整的 UI/交互设计与实现方案见 [docs/plans](docs/plans/) 目录。
