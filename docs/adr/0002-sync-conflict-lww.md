# ADR-0002 同步冲突策略

- 日期: 2026-03-04
- 决策: MVP 使用 `LWW(version > updated_at > source_device_id)`。
- 原因: 实现复杂度最低，可快速闭环。
- 影响: 存在覆盖风险，必须写入 history 表。
