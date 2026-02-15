# Web Testing Guide

## Commands

```bash
npm run test
npm run test:run
npm run test:coverage
npm run test:e2e
npm run test:e2e:headed
npm run test:ci
```

## Test Layers

- `tests/unit`: 纯逻辑与展示组件测试。
- `tests/component`: 客户端组件交互测试（Vitest + RTL）。
- `tests/server`: `proxy` 与 `route handler` 的服务端测试。
- `tests/e2e`: Playwright 关键链路烟测。

## Environment Variables

在 CI 或本地测试环境中，至少提供以下变量（可使用假值）：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_BASE_URL`
- `SITE_URL`

E2E 默认通过 mock 服务隔离外部依赖，不连接真实 Supabase。
