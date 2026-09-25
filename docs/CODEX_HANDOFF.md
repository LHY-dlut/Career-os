# Maintenance Handoff

原型基线 `7e7b59b`；工程接管分支 `refactor/codex-foundation`。Audit 先于代码提交。先读 `CODEX_AUDIT.md`、`ARCHITECTURE.md`、`FOUNDATION_REPORT.md`，区分已验证的本地行为与尚未联通的云端环境。Audit / Foundation Report 保留第一轮历史记录；当前 AI 默认供应商已改为 DeepSeek，现行配置以 `.env.example` 和 DEPLOYMENT 为准。

## 修改约定

1. 保留 React + Vite + Firebase + Express，不为目录整齐迁移框架/数据库。
2. 新增数据行为从 repository/schema 与 WorkspaceActions 开始；页面不直接调用 Firestore/localStorage。相关多实体写入必须原子提交。
3. 不合并 guest 与登录身份；不给失败云写入提供假本地成功。所有错误在 UI 可见。
4. AI 仅通过服务端调用；新增 `/api/copilot/*` 继承统一授权、配额、输入限制和错误处理，不添加虚构 fallback。
5. 新增类型/规则同时更新校验及测试；改动持久化先考虑旧备份兼容。规则不能只凭肉眼声称验证。
6. 使用 npm lock；提交按真实职责分组。先 `npm ci`，再 lint/typecheck、测试、规则模拟器、build、生产 health；必要时做浏览器实操。

## 当前实现取舍

- 用户指定 AIInfraGuide 为主要布局参考：全局改用顶部导航与手机抽屉，首页学习门户与底部真实工作台并存；知识总览和分类不再隐式选中第一篇。分类必须保留为编码后的 URL 参数，不以翻译标签作为存储值。阅读目录和 CRUD 保留原有数据接口。
- 界面翻译使用 `src/i18n/I18nProvider.tsx`：`t(英文, 中文)`、固定枚举的 `label()` 与日期 `locale`。默认中文，语言作为浏览器显示偏好单独保存，不属于账号记录或备份；严禁将翻译后的标签写入业务枚举，也不自动翻译用户正文。新增 UI 必须同时提供中英文。
- 6 篇原型入门文章的中文稿在 `starterArticleLocalization.ts`，仅当文章所有内容字段与旧种子一致时用于展示，不依赖 ID、不自动保存。中文阅读、首页和搜索共用它；用户编辑或导入的内容不匹配时保持原文。目录标题本地化通过 `MarkdownRenderer.headingLabels` 显示，必须保留原始锚点 ID，不能通过替换原 Markdown 标题实现。
- 不用 Redux/新数据库；React Context + 轻量仓库已足够第一轮。
- 访客单快照保证恢复和关系写入原子性；大体量/多标签页并发是后续工作。
- 云端九个 userId 查询，无离线 fallback；没有实时多端刷新和冲突检测。
- 简单间隔调度便于理解和测试；不要把它宣传成 SM-2 / FSRS。
- AI 默认使用 DeepSeek-V4.1-Flash 的 `deepseek-flash` API 模型名，所有档位关闭 thinking 并使用同一模型；不自动重试或回退到另一付费供应商。Gemini 仅可显式配置启用。
- DeepSeek 接入没有联网搜索。UI 根据 `/api/capabilities` 禁用搜索，后端也必须拒绝；不能把模型回答中的网址当作已检索的来源。Gemini grounding 保留。
- 云恢复/重置尚未实现，UI 不展示这些承诺。规则对字段的完整业务 schema 验证仍需后续加强。
- 临时修正 gaxios 的 uuid 到兼容 v4 API 的 `^11.1.1`，规避间接旧版 advisory。升级 firebase-admin/gaxios 后检查能否移除 overrides。
- `lint` 目前保留原项目的 TypeScript 检查语义。需要逐步引入 ESLint 时，单独限定受影响文件，避免无关格式大改。

## 本地工具与测试

Node 22.12+；Firestore 模拟器需 Java 21+。本次 Windows 只在被忽略的 `.tools/java21` 下载临时 JRE，没有改系统 Java 8。新机器自行安装 Java 21 或 CI 使用 setup-java；不要依赖此临时目录。

浏览器手动验证使用 Playwright CLI；截图在忽略的 `output/playwright`，浏览器录制在 `.playwright-cli`。它们不是正式产品资源。Vitest 测试在 `tests/`，规则测试隔离在 `tests/rules/`。

## 下一位维护者先处理

资料库已收录 151 篇 MIT 教程快照和 29 个原文入口，维护范围、出处与更新命令见 CONTENT_SOURCES。全文在 `public/library` 按篇请求，不注入个人 Dataset；`/library` 在 Auth/Firestore 暂未就绪时也必须可读，但不能写个人笔记。保存笔记只保存个人模板与出处，已有笔记只打开不覆盖。更改收录正文必须同步导入脚本及 provenance，保留许可和原文链接。

手机外网阅读已于 2026-09-25 发布至 https://career-os-lhy-dlut.web.app/library 。用户完成 Firebase CLI 登录后，确认可管理已有 Firebase 项目且未启用计费；因 Google 项目配额已满，在该项目新建独立的 `career-os-lhy-dlut` Hosting 站点。`firebase.json` 使用 `career-os` target，本地 `.firebaserc` 保存项目映射并被 Git 忽略，新部署机需按 DEPLOYMENT 重新绑定目标。公网路由与主静态资源已核验；站内 Auth/Firestore/Render/DeepSeek 仍未配置，访客笔记仍仅保存在当前浏览器。

按 DEPLOYMENT 联通测试项目，在真实账号完成登录持久化、双账号隔离、云 CRUD、Admin 撤销验证、真实 DeepSeek 调用及错误处理；若启用 Gemini，另验收其 grounding 来源。`configured` 仅反映模型 Key 是否填写，不代表凭证已验证。再推进 v0.3，而不是提前搭高级 RAG。参考网站的三方面设计计划已在 ROADMAP 保留。
