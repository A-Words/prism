# Prism UI Components Manifest

## 1. 目的
1. 记录 Shadcn 全量引入后在项目内实际启用的组件。
2. 标记组件用途、归属模块、封装入口与风险等级。
3. 避免业务代码直接散用原子组件，统一通过 `Prism*` 组件调用。

## 2. 使用规则
1. 业务页面禁止直接从 `@/components/ui/*` 大面积散用，优先从 `@/components/prism/*` 使用封装组件。
2. 新增 Shadcn 组件时，必须同步更新本清单。
3. 高成本组件（如 `Command`、复杂 `Dialog` 组合）默认采用动态加载。
4. 所有组件样式必须使用 CSS Variables，不允许页面内硬编码颜色和间距。

## 3. 组件清单
| 组件 | 模块 | 业务用途 | 封装出口 | 风险等级 |
| --- | --- | --- | --- | --- |
| `Input` | FR-01 | 文本探索输入 | `PrismExplorePanel` | 低 |
| `Textarea` | FR-01 | 多行探索输入 | `PrismExplorePanel` | 低 |
| `Button` | FR-01/全局 | 提交、确认、重试 | `PrismButton` | 低 |
| `Popover` | FR-01/FR-04 | 附件入口、Orb 交互层 | `PrismExplorePanel` / `PrismOrbAssistant` | 中 |
| `Tooltip` | FR-01/全局 | 操作提示 | `PrismTooltip` | 低 |
| `Card` | FR-01 | 导图/结果容器 | `PrismKnowledgeCanvas` | 低 |
| `ScrollArea` | FR-01/FR-02 | 可滚动内容容器 | `PrismScrollPanel` | 低 |
| `Tabs` | FR-02 | 笔记视图切换 | `PrismNotesPanel` | 低 |
| `Separator` | FR-02 | 结构分隔 | `PrismNotesPanel` | 低 |
| `Skeleton` | FR-02 | 流式加载占位 | `PrismNotesPanel` | 低 |
| `Badge` | FR-02/FR-03 | 标签状态显示 | `PrismStatusBadge` | 低 |
| `Toast` | FR-02/全局 | 操作反馈 | `PrismToaster` | 低 |
| `Dialog` | FR-02/FR-04 | 二次确认、深层交互 | `PrismDialog` | 中 |
| `Alert` | FR-03 | 权限/异常提示 | `PrismVisionGuard` | 低 |
| `Switch` | FR-03 | 监测开关 | `PrismVisionGuard` | 低 |
| `Sheet` | FR-03 | 监测详情侧栏 | `PrismVisionSheet` | 中 |
| `Progress` | FR-03 | 专注/状态趋势显示 | `PrismVisionGuard` | 低 |
| `HoverCard` | FR-03 | 状态解释提示 | `PrismVisionGuard` | 低 |
| `Command` | FR-04/全局 | 快捷命令与检索 | `PrismCommandPalette` | 高 |
| `DropdownMenu` | FR-04 | Orb 快捷动作 | `PrismOrbAssistant` | 中 |
| `Toaster` | 全局 | 统一反馈通道 | `AppProviders` | 低 |
| `ThemeProvider` | 全局 | 主题注入 | `AppProviders` | 低 |
| `TooltipProvider` | 全局 | Tooltip 容器 | `AppProviders` | 低 |

## 4. 变更流程
1. 任何新增或移除组件都需在 PR 中包含此文件更新。
2. 代码评审需核验“组件使用路径是否经 `Prism*` 封装层”。
3. 每个里程碑结束执行一次组件清单与实际代码引用对账。
