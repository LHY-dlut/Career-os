# Architecture

界面语言由 `I18nProvider` 统一提供，默认简体中文，可在顶部和设置页切换英文。显示语言保存在浏览器偏好中，并同步同源标签页；翻译只作用于界面标签、已知应用错误和日期格式，不改变用户内容、状态枚举或备份数据。AI 新请求按所选语言回答，已有生成结果保留原文。

## 运行关系

```mermaid
flowchart LR
  Browser[React / React Router] --> Auth[Firebase Auth]
  Browser --> Providers[AuthProvider / DataProvider]
  Providers --> Local[Guest: identity-scoped localStorage]
  Providers --> Cloud[Signed in: Firestore Repository]
  Cloud --> Rules[Owner and relationship rules]
  Browser --> Client[Shared API client + ID token]
  Client --> API[Express: CORS / Auth / limits / validation]
  API --> Provider[Server-selected AI provider]
  Provider --> DeepSeek[DeepSeek API: default]
  Provider --> Gemini[Gemini API: optional]
```

Firebase Hosting 发布 `dist`，Render 运行编译后的 Express API。开发 Vite 挂载同一个 Express app。生产 Express 也能服务静态 SPA，用于本地验证与可选单服务运行。

## 责任边界

| 位置 | 责任 |
| --- | --- |
| `src/App.tsx` | 错误边界、Toast、Auth、Router、按身份重新挂载工作区 |
| `src/app/AuthProvider.tsx` | 单一认证观察者、初始化等待、登录退出错误 |
| `src/app/DataProvider.tsx` | 仓库加载、过期请求丢弃、保存成功后更新 UI、恢复/导出 |
| `src/app/WorkspaceActions.ts` | 级联删除、复习原子写入、面试真题转题库、显式资料初始化 |
| `src/app/AppRoutes.tsx` | URL 与原有页面 props 的适配，按页面懒加载 |
| `src/layouts/AppLayout.tsx` | 导航栏、侧边栏、搜索、主题、加载/失败显示 |
| `src/repositories/` | 类型契约、Zod 实体约束、local/cloud 实现和选择 |
| `src/services/backup.ts` | 备份格式、关系校验、访客恢复/重置 |
| `src/services/apiClient.ts` | API base、当前身份 token、超时和错误 |
| `src/server/` | 授权、配额、输入校验、AI 供应商选择与结构化输出校验 |
| `src/utils/` | 确定性 heading、frontmatter、纯复习调度函数 |

保留现有 pages，不为目录对称创建大型 framework。业务更复杂后再拆 Knowledge、AICopilot 等大页面。

## 路由

`/dashboard`、`/knowledge[/:articleId]`、`/questions[/:questionId]`、`/review`、`/coding[/:problemId]`、`/applications[/:applicationId]`、`/interviews[/:interviewId]`、`/copilot`、`/settings`。

复习特定题用 `/review?question=ID`，快捷新增用 `?new=1` 并在消费后移除。不存在的实体显示 Record not found。Copilot 临时提示词通过 router state 传递，不放入 URL。文章目录与正文共用 Markdown AST heading 插件，支持中文、重复与内联标题。

## 数据与持久化

九类数据：articles、questions、reviewHistory、codingProblems、codingAttempts、applications、interviews、interviewQuestions、mockSessions。实体仓库暴露 `list/save/remove`，跨实体业务用 `commit(Mutation[])`，避免半成功记录。

- 访客：`ai_career_os:guest:data` 中一个 JSON 快照，一次 `setItem` 成功后更新 React 状态；存储配额失败保留旧快照。只在 key 从未存在时生成学习资料，空集合不会重新填种子。
- 云端：保留原集合名 `knowledgeArticles`、`questions`、`reviewHistory`、`codingProblems`、`codingAttempts`、`applications`、`interviews`、`interviewQuestions`、`mockInterviewSessions`；查询均包含 `userId == uid`，使用 Firestore batch。每批上限 450 条，超过直接拒绝，无部分提交。
- 云端不使用本地业务缓存，不在失败时写访客。账户切换重新挂载数据、页面与搜索，旧加载结果失效。
- 主题单独位于 `ai_career_os:<encoded-identity>:theme`。Google 登录态由 Firebase SDK 管理，不与业务备份混用。
- 复习 Question 与 ReviewHistory 同批写；面试真题升格 Question 与 InterviewQuestion.questionId 同批写。删除投递级联当前已加载的面试及真题，删除题目清理历史并解除真题关联。
- 多标签页/设备同时编辑仍是最后写入者获胜；当前没有实时订阅、冲突版本或数据库触发级联。UI 暂阻止同一工作区的重叠提交。规则保证所有者与写入时的关联，但不阻止拥有者在外部客户端删除父记录后留下孤儿。

## 数据兼容与迁移

云端集合和字段保留，无数据库迁移脚本。旧的不完整记录会触发可见校验错误，不能静默当成成功读取；先备份、修复具体记录后重试。部署加强版 rules 前检查自己的历史孤儿记录，特别是原型生成的 `applicationId: manual`。

旧全局 `ai_career_os_*` key 无法可靠确定归属，因此不自动迁移，也不删除。最好在原型版本导出 v1.0 备份，再恢复到访客；该版本同时接受 v1.0/v2.0。若旧版本已不可用，可在浏览器开发者工具保留这些 key 的原文后离线整理为符合 schema 的备份，先修复缺失关联，再导入。不要直接把旧数据归给最后登录的云账号。

恢复会将业务记录 userId 重绑定为 guest，保留实体 ID/关联，完整校验后一次性写入。云导出重新读取 Firestore，但九个查询不是一个跨集合时间点快照；多端编辑期间的严格一致备份及云恢复留待后续设计。

原有 `firebase-applet-config.json` 是旧公开客户端配置，`firebase-blueprint.json` 是原型说明；运行时均不读取。实际配置来自环境变量，实体约束以 `repositories/schemas.ts` 和 Firestore rules 为准。

## AI 边界

浏览器不导入模型 SDK 或 Admin SDK。`apiClient` 校验登录身份并携带 ID token；Admin 验证 token（包括撤销检查）后检查 UID allowlist。`AI_PROVIDER` 默认为 `deepseek`，`DEEPSEEK_MODEL` 默认为 `deepseek-flash`（当前为 DeepSeek-V4.1-Flash）；只有显式设置 `AI_PROVIDER=gemini` 才使用原 Gemini 配置。模型由服务端环境变量决定，结果展示实际 `modelUsed`。

DeepSeek 通过服务端原生 fetch 调用固定官方地址。Standard / Deep / Fast 均使用同一个 DeepSeek 模型并关闭 thinking，输出上限 4096 tokens，超时 30 秒；不会自动重试或改用另一付费供应商。结构化结果使用 JSON 模式、提示词中的字段约束和 Zod 验证。Gemini 档位仍可通过 `GEMINI_MODEL` / `GEMINI_PRO_MODEL` / `GEMINI_LITE_MODEL` 分别配置。

公开 `GET /api/capabilities` 只返回 `provider`、`model`、`webSearch`、`configured`，供 UI 展示配置与可用功能；不调用模型、不返回 Key，也不替代认证或实际连通检查。DeepSeek 接入禁用联网搜索，并在服务端拒绝该请求；Google grounding 仅供显式选择的 Gemini 使用。

无 token/无效 token 为 401，未授权 UID 403，未配置服务 503，输入不合法 400，超配额 429，模型失败 502。Provider 错误不把凭证/请求内容发送回浏览器。不伪造联网引用；JD 可关联标题必须属于本次提交的实际标题集合。完整本地知识检索与引用传参仍属下一阶段，不称为 RAG。
