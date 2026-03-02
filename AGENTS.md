# AGENTS.md — Prism 项目 AI 编码代理指南

Prism 是一个 AI 驱动的自适应学习生态系统，提供学习路径规划、智能辅导、笔记管理和健康监测等功能。

## 项目结构

Monorepo，包含三个独立服务：

```
prism/
├── web/       → 前端（Next.js 16, TypeScript, Tailwind CSS）
├── server/    → 后端核心（Go 1.25, Gin, GORM）
├── ai/        → 智能微服务（Python 3.14, FastAPI, LangChain）
├── docker-compose.yml      → 生产编排
└── docker-compose.dev.yml  → 开发编排
```

| 服务 | 端口 | 语言 | 包管理 |
|------|------|------|--------|
| web | 3000 | TypeScript | npm |
| server | 8080 | Go | go modules |
| ai | 5000 | Python | pip (requirements.txt) |

## 核心功能模块

开发任何功能时，需理解以下六大模块的职责：

1. **学习路径规划** — 知识追踪、路径优化、能力评估、作业批改（LangChain, pgvector, Vision API）
2. **情绪干预** — 表情/语音/行为分析、注意力监测、干预策略（Vision API, Whisper API, WebSocket）
3. **虚拟导师** — 多轮对话、知识图谱问答、共情回复（LangChain RAG, pgvector）
4. **智能笔记** — 语音转写、OCR、知识结构化、语义搜索（Whisper API, Vision API, pgvector）
5. **健康管理** — 专注度追踪、疲劳检测、姿态分析、休息建议（Vision API Pose, WebSocket）
6. **跨场景适配** — 场景识别、场景策略、数据同步（前端状态机, Context API）

## PRD 文档读取规则（按需求）

处理需求时，Agent 必须按“最小必要”原则读取 `docs/` 中的 PRD 文档，避免无关上下文污染。

### 基本规则

1. 任何功能开发前，先读：`docs/product-prd.md`（冻结术语、全局边界、分期定义）。
2. 然后只读与需求直接相关的模块 PRD（可 1~2 个），不要默认全量读取六个模块。
3. 若需求涉及演示流程、答辩、回退策略，额外读取：`docs/prd-demo-runbook.md`。
4. 当代码实现与 PRD 冲突时，先遵循用户当次明确需求；若用户未明确，则以 PRD 为默认基线并在回复中说明偏差。

### 模块到文档映射

- 学习路径规划：`docs/module-learning-path.md`
- 情绪干预：`docs/module-emotion-intervention.md`
- 虚拟助教：`docs/module-virtual-tutor.md`
- 智能笔记：`docs/module-smart-notes.md`
- 健康管理：`docs/module-health-management.md`
- 跨场景适配：`docs/module-cross-scene-adaptation.md`

## 编码规范

### 通用规则

- **注释语言**：所有复杂逻辑注释必须使用**中文**
  ```
  // 检查用户是否在过去 5 分钟内有过疲劳记录
  ```
- **格式化**：遵循各语言标准格式化工具（gofmt、ruff、prettier）
- 避免过度工程，只做直接被要求或明确必要的修改
- 不要引入安全漏洞（命令注入、XSS、SQL 注入等）

### web/ — 前端规范

- 使用 **App Router**，不使用 Pages Router
- 样式只用 **Tailwind CSS + Shadcn/UI + Lucide Icons**，除 `global.css` 外不允许创建 `.css` 文件
- 组件保持在 **200 行以内**，使用组合模式拆分
- 数据获取：Server Actions 用于 mutations，SWR/TanStack Query 用于客户端获取
- 路由保护：**永远不要**将 cookie 存在视为已认证状态，必须使用 `auth.getUser()` 做权威校验
- Supabase 客户端：区分 Server Components 和 Client Components 使用的客户端实例

### server/ — 后端规范

- 代码组织在 `internal/` 目录下：`handler/`、`middleware/`、`service/`、`repository/`、`model/`、`config/`、`ai/`
- 错误处理必须显式：
  ```go
  if err != nil {
      log.Printf("处理失败: %v", err)
      c.JSON(500, gin.H{"error": "internal server error"})
      return
  }
  ```
- 认证策略：**本地 JWT 验证**（通过 Supabase JWKS），验证 `sub/exp/iss/aud` 字段，`aud` 必须包含 `authenticated`。不要每次请求都调用 Supabase Auth API
- 使用 Goroutine 转发 AI 请求，避免阻塞 WebSocket 读循环

### ai/ — AI 服务规范

- 使用 **LangChain** 的 Runnable/Chain 模式构建处理管道
- 所有 FastAPI 端点必须使用 **类型注解**
- AI 调用设计为**可切换供应商**（通过环境变量）
- 默认通过 **OpenRouter** 网关调用，不做本地模型推理

## 认证机制

- 请求头：`Authorization: Bearer <Supabase_JWT>`
- 服务端通过 Supabase JWKS 本地验证 JWT 签名
- 前端受保护路由必须通过 `proxy.ts` + `auth.getUser()` 守卫
- `redirectTo` 必须清洗为同源相对路径
- 登出必须调用 `supabase.auth.signOut()` 清除会话状态和 cookie

## 服务间通信

### WebSocket 通道

- `/ws/monitor` — 实时学习监测（视频帧/音频块上行，情绪/专注度/姿态反馈下行）
- `/ws/assistant` — 虚拟助教对话（消息上行，流式响应下行）

### 内部 API（Server → AI，HTTP）

| 端点 | 功能 |
|------|------|
| `POST /analyze/emotion` | 情绪分析（图像 + 音频） |
| `POST /analyze/pose` | 姿态估计 |
| `POST /chat/completions` | RAG 对话（SSE 流式） |
| `POST /speech/transcribe` | 语音转文字 |
| `POST /vision/ocr` | OCR / 图像理解 |
| `POST /embed` | 知识向量嵌入 |
| `POST /search` | 语义搜索 |

AI 服务基地址：`http://ai:5000`

## 数据库

PostgreSQL 17+（Supabase 托管），需启用扩展：

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 用户与档案

**public.profiles**（关联 `auth.users`）

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | uuid (PK, FK → auth.users) | 用户 ID |
| `username` | text | 用户名 |
| `avatar_url` | text | 头像地址 |
| `current_scene` | varchar | 当前场景（`classroom`/`self-study`/`exam-prep`） |

### 知识图谱

**public.knowledge_points**（节点）

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | serial (PK) | |
| `subject` | varchar | 学科（`math`/`physics` 等） |
| `title` | text | 知识点标题 |
| `content` | text | 知识点内容 |
| `embedding` | vector(1536) | 向量嵌入 |

**public.knowledge_dependencies**（边）

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | serial (PK) | |
| `knowledge_id` | int (FK → knowledge_points.id) | 知识点 |
| `prerequisite_id` | int (FK → knowledge_points.id) | 前置知识点 |

约束：建议做逻辑环检测。

**public.knowledge_mastery**（用户掌握度）

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | serial (PK) | |
| `user_id` | uuid (FK → profiles.id) | |
| `knowledge_id` | int (FK → knowledge_points.id) | |
| `mastery_level` | float | 掌握度（0.0 - 1.0） |
| `last_practiced_at` | timestamp | 最近练习时间 |

唯一约束：`(user_id, knowledge_id)`

### 学习与题目

**public.questions**

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | serial (PK) | |
| `knowledge_point_id` | int (FK) | 关联知识点 |
| `difficulty` | float | 难度（0.0 - 1.0） |
| `content` | jsonb | 包含题目、选项、答案、解析 |

**public.learning_paths**（用户学习路径）

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | serial (PK) | |
| `user_id` | uuid (FK) | |
| `knowledge_sequence` | int[] | 有序知识点 ID 列表 |
| `current_index` | int | 当前进度索引 |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**public.assignments**（作业提交）

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | serial (PK) | |
| `user_id` | uuid (FK) | |
| `question_id` | int (FK) | |
| `answer_content` | text | 用户作答（可能是 OCR 结果） |
| `is_correct` | boolean | 是否正确 |
| `ai_feedback` | text | AI 反馈 |
| `submitted_at` | timestamp | |

### 情绪与健康监测

**public.study_logs**（学习会话日志）

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | serial (PK) | |
| `user_id` | uuid (FK) | |
| `scene` | varchar | 场景（`classroom`/`self-study`/`exam-prep`） |
| `emotion` | varchar | 情绪（`confused`/`focused`/`anxious` 等） |
| `focus_score` | float | 专注度（0.0 - 1.0） |
| `fatigue_level` | float | 疲劳度（0.0 - 1.0） |
| `posture_status` | varchar | 姿态（`good`/`slouching`/`too_close`） |
| `created_at` | timestamp | |

**public.health_alerts**（健康预警）

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | serial (PK) | |
| `user_id` | uuid (FK) | |
| `alert_type` | varchar | 类型（`fatigue`/`posture`/`break_needed`/`stress`） |
| `message` | text | 提示信息 |
| `acknowledged` | boolean (default false) | 是否已确认 |
| `created_at` | timestamp | |

### 虚拟助教

**public.chat_sessions**

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | serial (PK) | |
| `user_id` | uuid (FK) | |
| `title` | text | 会话标题（自动生成或用户设置） |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**public.chat_messages**

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | serial (PK) | |
| `session_id` | int (FK → chat_sessions.id) | |
| `role` | varchar | 角色（`user`/`assistant`） |
| `content` | text | 消息内容 |
| `related_knowledge_ids` | int[] | 关联知识点（可选） |
| `created_at` | timestamp | |

### 笔记系统

**public.notes**

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | serial (PK) | |
| `user_id` | uuid (FK) | |
| `title` | text | 笔记标题 |
| `content` | text | 内容（markdown 或结构化） |
| `source_type` | varchar | 来源（`manual`/`voice`/`ocr`/`auto-generated`） |
| `embedding` | vector(1536) | 向量嵌入 |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**public.note_knowledge_links**（笔记与知识点关联）

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | serial (PK) | |
| `note_id` | int (FK → notes.id) | |
| `knowledge_id` | int (FK → knowledge_points.id) | |
| `relevance_score` | float | 相关度 |

## 测试

### web/

```bash
npm test                # 监听模式运行单元测试
npm run test:coverage   # 生成覆盖率报告（阈值：行/函数/语句 70%，分支 60%）
npm run test:e2e        # Playwright E2E 测试
npm run test:ci         # CI 全流程（lint + coverage + e2e）
```

- 单元/组件测试：Vitest + React Testing Library + MSW（网络隔离）
- E2E 测试：Playwright（Chromium），针对生产构建运行
- 安全关键流程必须有测试覆盖：`proxy.ts`、`app/(auth)/callback/route.ts`、重定向清洗、认证跳转

### server/

```bash
go test ./...           # 运行所有测试
```

- 使用 Go 标准 `testing` 包 + `go.uber.org/mock`
- 测试文件位于 `internal/` 各子包中

### ai/

```bash
pytest                  # 运行所有测试
```

- 使用 pytest，测试文件位于 `tests/` 目录

## 环境变量

测试环境基线配置参见 `web/.env.test.example`。

关键变量：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SITE_URL=...

# AI 供应商（默认 OpenRouter）
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_DEFAULT_MODEL=anthropic/claude-sonnet-4

# 按任务指定模型
MODEL_CHAT=anthropic/claude-sonnet-4
MODEL_VISION=openai/gpt-4o
MODEL_EMBEDDING=openai/text-embedding-3-small
```

## 开发启动

```bash
docker compose -f docker-compose.dev.yml up   # 启动所有服务
```

数据库迁移通过 Supabase CLI 或 Go 迁移脚本管理。

## CI/CD

- 工作流文件：`.github/workflows/web-tests.yml`
- 触发条件：PR 涉及 `web/**` 或工作流文件变更
- 流水线：Web Lint + 单元/组件/服务端测试 → Web E2E 测试
- 合并前 `npm run test:ci` 必须通过
