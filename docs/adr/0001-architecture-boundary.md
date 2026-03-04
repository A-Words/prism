# ADR-0001 架构边界

- 日期: 2026-03-04
- 决策: 采用 `React(Web/Tauri共享) + 本地 Go BFF + Supabase`。
- 原因: 统一 Provider 编排、离线队列、鉴权与可观测。
- 影响: 前端不直接调用模型服务。
