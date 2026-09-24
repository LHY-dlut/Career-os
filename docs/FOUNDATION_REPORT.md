# 第一轮工程接管报告

日期：2026-09-24。原型基线 `7e7b59b`，工作分支 `refactor/codex-foundation`。范围遵循接管说明第 41 节；没有迁移框架/数据库或实现高级 RAG。

## What I Found

原型已有完整页面、可复用数据类型、学习资料、Markdown/公式与 Express AI 边界。核心问题是 App 过载、内存导航、访客仍访问 Firestore、无身份 localStorage、错误备份语义、公开 AI 额度入口、可篡改 userId 的规则、假 AI fallback、复习队列跳题。详见改代码前提交的 [Audit](CODEX_AUDIT.md)。

## What I Changed

- React Router 正式 URL 和实体地址，统一 shell，App 缩为组合入口；Auth/Data/Theme/CRUD 分工。
- local/cloud repository 明确分离；访客一次快照写入，空集合不重新填充，云端失败不会覆盖访客；账号切换丢弃旧请求。
- Zod 备份版本、实体、ID 与关联校验；导出/访客恢复/访客重置语义一致。旧全局 key 保留，不擅自迁移归属。
- Google 登录初始化等待与持久化；未配置云服务也能运行访客。显式加载学习资料只创建内容，不创建成绩或职业活动。
- 统一 token API client，Express 鉴权/allowlist/限流/输入限制/CORS/健康检查；编译后启动。
- 修复 TOC/中文重复标题、代码复制和高亮、frontmatter、前后篇、Cmd/Ctrl+K；模态框基础焦点/键盘处理。
- 修复复习题与历史的原子保存、会话跳题、面试真题升格后丢关联；补齐 Withdrawn 阶段。
- npm lock、Vitest、Firestore 规则测试、CI、Firebase Hosting 配置、完整文档。

## Architecture Decisions

保留 React/Vite/Firebase/Express；React Context + 轻量仓库，不引入额外状态框架。云端保留原集合。访客数据本地单快照，云端批量写入，相关实体一起提交。模型实际选择由服务端配置。UI 原有深色布局保留；四个参考网站的阅读体验、内容组织、视觉三个方向全部记录在 [Roadmap](ROADMAP.md)，首轮仅做基础阅读/导航修复。

## Security Fixes

付费 AI 禁止访客；Admin ID token 验证（含撤销检查）、UID allowlist、IP/用户/服务三级内存配额、请求体与字段上限、精确 origin。所有者与文档 id 不可转移，子记录关联必须属于同账号。去除假答案、假引用和假同步提示；API 不回传 provider 敏感异常。Gemini Key/Admin 凭证不进入浏览器和 Git。详细边界及内存限流局限见 [Security](../security_spec.md)。

## Tests Added

| 检查 | 已执行结果 |
| --- | --- |
| `npm ci` | 通过；安装 587 个包。首次遇到 Windows 开发服务占用 native addon，停止服务后重跑通过 |
| `npm run lint` / `npm run typecheck` | 通过；两个脚本目前均执行 TypeScript 类型检查 |
| `npm test` | 5 个文件、25 项通过 |
| `npm run test:emulator` | 1 个文件、5 项通过；真实 Firestore 模拟器 + 临时 Java 21 |
| `npm run build` | 前端与编译服务端通过 |
| `npm audit --omit=dev` | 0 vulnerabilities；最终 npm ci 的全依赖 audit 也为 0 |
| 生产 `/api/health` | HTTP 200，精确 `{"status":"ok"}` |
| 生产深链接请求 | `/knowledge/seed-art-1` HTTP 200，返回 SPA |
| 无 token 的生产 AI 请求 | HTTP 401，无模型调用 |

基础测试覆盖纯复习算法、Markdown AST/DOM ID 一致性、YAML 兼容、repo 选择/隔离/配额失败、空集合、学习资料 ID、备份损坏/关联/重置范围、身份切换异步竞态、真实 HTTP 的鉴权/CORS/输入/错误/限流。规则测试覆盖九集合匿名/跨账号访问、查询约束、owner/id 篡改、父记录所有权与批量写原子性。HTTP 测试的 token/provider 是注入替身，不等同真实云 API 验收。

浏览器实操（Playwright CLI，生产构建）：全局搜索 RoPE → 文章实体 URL → 刷新/前进/后退；文章 TOC；连续两题评分保存 `seed-q-1`、`seed-q-2`；新建投递并持久化 Withdrawn；新建所属面试；真题升格题库后刷新保持 questionId；导出 JSON → 重置访客 → 恢复备份，投递和关联数据恢复。生产控制台抽查 0 errors / 0 warnings。临时 QA 数据只在独立测试浏览器的 localhost 工作区。

## Build Status

通过。Vite 仍提示主 chunk 约 515 kB（gzip 158 kB）超过默认 500 kB 提示阈值；Markdown 渲染约 482 kB、Firestore 按登录动态加载。此为性能改进项，未通过提高阈值隐藏。安装仍有部分间接包弃用警告；audit 没有报告已知漏洞，不代表不存在未知问题。

## Deployment Status

Firebase Hosting SPA rewrite、Firestore rules、Render build/start/health/env 配置说明均已准备。本地生产运行通过。**未实际部署**：工作区没有用户的真实 Firebase/Auth、Admin、Gemini/Render 凭证，未进行 Google popup、真实双账号云 CRUD、撤销 token、付费 Gemini 调用或跨服务上线验收。健康检查不验证外部凭证。CI 已定义，远程运行结果以 GitHub Actions 为准。

## Remaining P1 Issues

1. 按 DEPLOYMENT 在真实测试项目联通并验收云端账户切换、Firestore、Admin、CORS、Gemini，然后再发布。
2. 完整 Interview ↔ Question 闭环：Link Existing Question、题目详情的 Review History / Interview Occurrences；现有升格关系已修复。
3. 完整 AI 产品流程：Coach 保存回题库、JD 传入当前真实标题、mock 多轮与会话保存、Knowledge Assistant 的本地上下文与引用。没有宣称本轮已实现。
4. 多端并发、实时同步、严格一致云备份/云恢复、持久配额/监控。当前最后写入者获胜，批量上限 450，内存限流重启清零。
5. 旧孤儿/不完整云记录需先备份修复；规则完整字段校验和拥有者删除父记录后的外部孤儿处理仍需加强。
6. CodingProblem 编辑/内容导入、面试可编辑排期/完整评分字段、业务完整表单等原型缺口放入 v0.3。

## Remaining P2 Issues

Knowledge/AICopilot 仍较大；进一步按职责拆分。主包性能、完整移动端适配、键盘可访问性/对比度审计、阅读历史、主题路径与统一视觉层级。lint 暂无 ESLint 规则，仓库尚无许可证。

## Recommended Next Sprint

先完成云端验收，再以一条真实面试题贯通 Application → Interview → InterviewQuestion → Question → Review → Knowledge Gap。与此同时只选 Knowledge 页面落地四站参考的内容树、阅读布局与视觉设计，形成可验收的样板后扩展。暂不引入向量数据库或 Agent 框架。

## 重要修改文件

`src/App.tsx`、`src/app/*`、`src/layouts/AppLayout.tsx`、`src/repositories/*`、`src/services/{firebase,apiClient,backup,aiCopilot}.ts`、`src/server/{app,security,apiRouter,geminiService}.ts`、`src/utils/{reviewScheduler,markdownHeadings,markdownFrontmatter}.ts`、原有 `pages/*` 与通用组件、`firestore.rules`、`firebase.json`、`server.ts`、`vite.config.ts`、`.env.example`、`package.json`/lock、`tests/*`、`.github/workflows/ci.yml`、README 与 docs。原 `services/db.ts` 和 bun lock 已移除。

## 命令记录（重复检查按命令合并）

- 仓库：`git clone https://github.com/LHY-dlut/Career-os.git .`、`git switch -c refactor/codex-foundation`、`git status --short`、`git log`、`git diff`、`git diff --stat`、`git diff --check`、`git add`、按职责 `git -c user.name=Codex -c user.email=codex@openai.com commit`。未更改全局身份。
- 审计/读取：`rg --files`、`rg -n`、`Get-Content`、`Get-ChildItem`、`Test-Path`、Node/npm/git/Java/gh 工具可用性检查。网页通过浏览工具读取四个参考站与官方文档。
- 依赖：`npm install`（新增 router/admin/Zod/限流/Markdown 工具和测试依赖）、`npm install -D esbuild@^0.28.0`、`npm audit`、`npm audit fix`、`npm uninstall -D firebase-tools`、`npm uninstall -D @playwright/test`、`npm ci`。测试工具不作为业务运行依赖；Firebase CLI 最终使用固定版本 npm exec。gaxios.uuid override 解决已知间接依赖问题。
- 检查：`npm run lint`、`npm run typecheck`、`npm test`、`npm run test:rules`（通过 emulator 调用）、`npm run test:emulator`、`npm run build`（含 build:server）、`npm audit --omit=dev`。
- 运行：`npm run dev`；`$env:NODE_ENV='production'; $env:PORT='3100'; npm start`；`Invoke-WebRequest` 请求 health、深链接、未登录 POST。
- 模拟器前置：通过 Adoptium 官方 API 的 `Invoke-RestMethod` 选择 Windows Java 21 JRE，`Invoke-WebRequest` 下载到 `.tools`，`Expand-Archive` 解压；仅本命令进程设置 `JAVA_HOME`/`Path` 后执行 `npm run test:emulator`。未改变系统 Java。
- 浏览器：`npx --yes --package @playwright/cli playwright-cli -s=career[-prod]` 下的 `open/goto/snapshot/find/click/fill/select/press/reload/go-back/go-forward/resize/screenshot/eval/run-code/console/dialog-accept`。快照、临时备份、截图存放忽略目录；没有新增低价值端到端测试文件。
- 工具中间失败均已处理：esbuild peer 版本冲突后统一版本；模拟器 Java 8 不足后使用临时 Java 21；Windows npm ci 文件占用后停 dev 重跑；改动后的旧浏览器 ref 重新 snapshot；CLI `network` 已更名为 `requests`；Vite 修改 provider 的 HMR 错误通过完整重载恢复，生产浏览器独立验证。

完整原始工具调用保留在本次任务记录；这里合并列出执行过的命令类别、关键参数和异常处理，不包含任何凭证。
