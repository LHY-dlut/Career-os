# AI Career OS

面向 LLM / RAG / Agent / Text-to-SQL / AI 算法岗位的个人学习与求职工作区。保留 Gemini 原型的 React、Vite、Firebase、Express 技术栈和深色界面，逐步补齐真实数据、可靠持久化与可部署工程基础。

Knowledge → Question Bank → Review → Coding → Applications → Interviews → Question Bank。

## Why

把分散的学习资料、复习记录与真实面试反馈连接起来，形成每天能使用的个人系统。优先保证数据正确、可维护和失败可恢复，再逐步增加 AI 能力。

## Features — 当前能力与边界

- 学习门户：首页参考 [AIInfraGuide](https://caomaolufei.github.io/AIInfraGuide/) 的顶部导航、居中首屏与主题卡片组织；个人知识数量、最近更新和下方工作台来自当前工作区。知识库提供分类总览、章节树与三栏阅读，手机可展开导航与目录。
- 学习资料库 `/library`：经核查许可的 AIInfraGuide、ARIS 教程作为固定快照随网站发布，正文按需加载；卡码与 labuladong 提供原文导航。支持来源/主题/标题标签搜索、目录、手机阅读与建立个人学习笔记。出处、许可证、收录范围和更新方式见 [资料来源](docs/CONTENT_SOURCES.md)。资料不会批量写入个人 localStorage 或 Firestore。
- 知识文章：Markdown、GFM、KaTeX、代码高亮/复制、目录锚点、前后篇、编辑、导入/导出。
- 题库与复习：搜索/筛选、CRUD、四档评分、原子保存复习历史。当前为简单间隔算法，不是完整 SM-2 / FSRS。
- Coding Lab：题目与多次练习记录分离；不执行用户代码。
- 投递与面试：看板/表格、阶段持久化、面试属于投递、真题加入题库时同时保存关联。关联已有题目等完整闭环见路线图。
- URL 路由、前进/后退/刷新、实体直达、Ctrl/Cmd+K 搜索、按身份隔离的主题。
- 中英文界面：默认简体中文，顶部语言按钮或设置页可随时切换 English；浏览器记住选择。导航、表单、提示与日期随语言切换，收录正文、用户文章和记录保留原文；AI 新请求按所选语言回答。
- 访客仅保存到当前浏览器。Google 登录打开独立 Firestore 工作区；云端错误不会自动切换为本地成功状态。
- AI 默认由 Express 调用 DeepSeek-V4.1-Flash；需要 Google 登录、服务端 UID 授权、Admin 凭证及 DeepSeek Key。未配置时显示真实错误，不生成假答案/引用。可显式切换回 Gemini。

## Screenshots placeholder

TODO：在完整云端验收和下一轮阅读体验设计后补充 Dashboard / Knowledge / Interview Loop 的正式截图。当前不引用缺失的图片文件。

## Architecture

React Router → 页面/Providers → Local 或 Firestore Repository；浏览器 ID token → Express → Firebase Admin 验证 → DeepSeek（或可选 Gemini）。部署为 Firebase Hosting 前端 + Render API，详见 [架构](docs/ARCHITECTURE.md)。

## Tech Stack

React 19、TypeScript、Vite 8、Tailwind 4、Firebase Auth/Firestore、Express 4、DeepSeek Chat Completions API、Google GenAI（可选）、Zod、Vitest。保留原型技术栈；版本以 lockfile 为准。

## Local Development

需要 Node.js **22.12+**（CI 使用 22）和 npm。唯一锁文件为 `package-lock.json`。

```sh
git clone https://github.com/LHY-dlut/Career-os.git
cd Career-os
npm ci
npm run dev
```

打开 `http://localhost:5173`。**不配置任何云凭证即可使用访客功能**。首次访客工作区含学习资料，投递、面试、练习、复习成绩从零开始。数据属于该浏览器的该 origin；换端口也会打开不同访客工作区。

需要云功能时，将 `.env.example` 复制为 `.env`，按 [部署说明](docs/DEPLOYMENT.md) 填写配置。开发默认同域 `/api`；独立 API 可设置 `VITE_API_BASE_URL=http://localhost:3000`。所有 `VITE_*` 都公开进浏览器，绝不能放模型 API Key 或 Admin 私钥。

新登录账号默认空白，可在 Settings 点击 **Load Starter Study Materials** 初始化学习资料；不会导入访客记录或制造职业活动。

内置资料库不需要登录即可阅读，在个人工作区加载失败时也可使用。`localhost` 不能供外网手机访问；将前端发布到自己的 Firebase Hosting 后，任意设备可访问同一资料网址。个人笔记跨设备同步另需配置 Firebase Auth/Firestore；未登录时仍仅存本浏览器。见 [最短阅读上线步骤](docs/DEPLOYMENT.md#只发布学习资料的最短路径)。

## 检查与构建

```sh
npm run lint
npm run typecheck
npm test
npm run test:emulator
npm run build
npm start
```

`lint` 与 `typecheck` 当前都是 TypeScript 检查（`tsc --noEmit`），尚未引入 ESLint 风格规则。规则测试需要 Java 21+、联网下载版本固定的 Firebase CLI/模拟器，使用 `demo-career-os`，不触碰云数据。

构建输出 `dist/` 与 `dist-server/`。`npm start` 执行编译后的 JavaScript，默认监听 `0.0.0.0:3000`。健康检查：`GET /api/health` → `{"status":"ok"}`。GitHub Actions 检查安装、类型、测试、规则、构建和生产服务。

## Environment Variables

变量模板在 `.env.example`。`VITE_FIREBASE_*`、`VITE_API_BASE_URL` 是公开构建配置；`DEEPSEEK_API_KEY`、可选 `GEMINI_API_KEY`、Admin 凭证、UID allowlist、CORS origins 仅在服务端。完整表格和构建/运行差异见 [环境配置](docs/DEPLOYMENT.md)。

## Firebase Setup

在自己的项目启用 Google 登录、配置 authorized domains、创建 Firestore、发布本仓库规则，并填写 Web App 的公开变量。新账号与访客独立，不能通过换登录身份共享本地缓存。

## AI Setup — 默认 DeepSeek

配置服务端 `AI_PROVIDER=deepseek`、`DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL=deepseek-flash`、`FIREBASE_PROJECT_ID` 和 Application Default Credentials；将本人 Firebase UID 加入 `AI_ALLOWED_UIDS`。空 allowlist 禁用付费 AI。`deepseek-flash` 是目前 DeepSeek-V4.1-Flash 的官方 API 模型名。[DeepSeek 官方发布说明](https://api-docs.deepseek.com/news/news260910/)

DeepSeek 的 Standard / Deep / Fast 档位都使用同一个模型并关闭 thinking；每次最多输出 4096 tokens，不自动重试或切换付费供应商。本接入未提供 DeepSeek 联网搜索，界面禁用该选项，服务端也会拒绝搜索请求。需要原有 Google grounding 时，显式设置 `AI_PROVIDER=gemini` 和 `GEMINI_API_KEY`，再配置可选的 `GEMINI_*_MODEL`。真实凭证、模型可用性与账单需要在自己的账号验收。

## Deployment

前端 `npm run build` 后发布 Firebase Hosting；Render 构建 `npm ci --include=dev && npm run build`，启动 `npm start`，健康检查 `/api/health`。详细步骤、secret file、CORS 和上线验收见 [DEPLOYMENT](docs/DEPLOYMENT.md)。当前提供部署准备，本轮未发布到真实云服务。

## 数据备份

Settings 的 **Export Backup** 导出当前访客或云工作区的业务记录。**Restore Backup / Reset Local Demo Data** 只作用于访客；没有云恢复/云重置。恢复先校验版本、实体字段、重复 ID 与关联完整性，再一次性替换；不会清空同 origin 的其他数据。主题不包含在业务备份里。

旧版无身份的 localStorage 数据不会自动归给当前账号，也不会被删除。升级前请用旧版导出，升级后可恢复到访客；详见 [迁移说明](docs/ARCHITECTURE.md#数据兼容与迁移)。

## 工程文档

- [原型审计](docs/CODEX_AUDIT.md)：改代码前的真实发现与渐进迁移计划。
- [架构与数据语义](docs/ARCHITECTURE.md)
- [Firebase Hosting + Render 部署](docs/DEPLOYMENT.md)
- [版本路线图与四个参考网站](docs/ROADMAP.md)
- [接手维护指南](docs/CODEX_HANDOFF.md)
- [第一轮交付报告与验证记录](docs/FOUNDATION_REPORT.md)
- [安全边界](security_spec.md)

## Roadmap

v0.1 原型 → v0.2 工程基础 → v0.3 Career Loop → v0.4 AI Copilot / 学习体验 → v0.5 RAG → v1.0 稳定日用。四个参考网站的阅读、内容组织、视觉三方面都纳入 [路线图](docs/ROADMAP.md)，首轮不进行大规模 UI 改版。

## License

当前没有仓库许可证文件，不能据此宣称采用 MIT。选择许可证由仓库所有者后续决定。
