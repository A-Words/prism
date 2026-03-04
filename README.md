# Prism MVP

Prism MVP monorepo for Focus Space learning experience.

## Workspace

- `apps/web`: React Focus Space UI
- `apps/bff`: Local Go BFF API
- `apps/desktop`: Tauri shell
- `packages/contracts`: shared types
- `packages/ui`: shared UI wrappers
- `infra`: SQL migrations

## Quick start

```bash
bun install
go mod tidy -C apps/bff
bun run dev:bff
bun run dev:web
```

Desktop:

```bash
bun --cwd apps/desktop install
bun run dev:desktop
```

## Env

Copy `docs/env.example` to `.env` and fill secrets.
