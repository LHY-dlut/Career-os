# Maintenance Handoff

原型基线 `7e7b59b`；工程接管分支 `refactor/codex-foundation`。Audit 先于代码提交。先读 `CODEX_AUDIT.md`、`ARCHITECTURE.md`、`FOUNDATION_REPORT.md`，区分已验证的本地行为与尚未联通的云端环境。

## 修改约定

1. 保留 React + Vite + Firebase + Express，不为目录整齐迁移框架/数据库。
2. 新增数据行为从 repository/schema 与 WorkspaceActions 开始；页面不直接调用 Firestore/localStorage。相关多实体写入必须原子提交。
3. 不合并 guest 与登录身份；不给失败云写入提供假本地成功。所有错误在 UI 可见。
4. AI 仅通过服务端调用；新增 `/api/copilot/*` 继承统一授权、配额、输入限制和错误处理，不添加虚构 fallback。
5. 新增类型/规则同时更新校验及测试；改动持久化先考虑旧备份兼容。规则不能只凭肉眼声称验证。
6. 使用 npm lock；提交按真实职责分组。先 `npm ci`，再 lint/typecheck、测试、规则模拟器、build、生产 health；必要时做浏览器实操。

## 当前实现取舍

- 不用 Redux/新数据库；React Context + 轻量仓库已足够第一轮。
- 访客单快照保证恢复和关系写入原子性；大体量/多标签页并发是后续工作。
- 云端九个 userId 查询，无离线 fallback；没有实时多端刷新和冲突检测。
- 简单间隔调度便于理解和测试；不要把它宣传成 SM-2 / FSRS。
- 云恢复/重置尚未实现，UI 不展示这些承诺。规则对字段的完整业务 schema 验证仍需后续加强。
- 临时修正 gaxios 的 uuid 到兼容 v4 API 的 `^11.1.1`，规避间接旧版 advisory。升级 firebase-admin/gaxios 后检查能否移除 overrides。
- `lint` 目前保留原项目的 TypeScript 检查语义。需要逐步引入 ESLint 时，单独限定受影响文件，避免无关格式大改。

## 本地工具与测试

Node 22.12+；Firestore 模拟器需 Java 21+。本次 Windows 只在被忽略的 `.tools/java21` 下载临时 JRE，没有改系统 Java 8。新机器自行安装 Java 21 或 CI 使用 setup-java；不要依赖此临时目录。

浏览器手动验证使用 Playwright CLI；截图在忽略的 `output/playwright`，浏览器录制在 `.playwright-cli`。它们不是正式产品资源。Vitest 测试在 `tests/`，规则测试隔离在 `tests/rules/`。

## 下一位维护者先处理

按 DEPLOYMENT 联通测试项目，在真实账号完成登录持久化、双账号隔离、云 CRUD、Admin 撤销验证、真实 Gemini 错误/来源处理。再推进 v0.3，而不是提前搭高级 RAG。参考网站的三方面设计计划已在 ROADMAP 保留。
