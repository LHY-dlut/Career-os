# Deployment — Firebase Hosting + Render

本文说明 Firebase Hosting 静态资料站的发布方式，以及按需启用账号同步和 Render AI 服务的配置。登录、规则、跨域和 AI 应分别完成联通验收。

## 当前线上状态

2026-09-25 已将前端构建发布到独立 Hosting 站点 `career-os-lhy-dlut`，并发布中文阅读修复：

- [学习资料库](https://career-os-lhy-dlut.web.app/library)，备用域名为 [firebaseapp.com](https://career-os-lhy-dlut.firebaseapp.com/library)。
- 使用登录后确认可管理的现有 Firebase 项目；Google 项目创建配额已满，因此在该项目内新建单独站点。发布前通过官方 Billing API 确认 `billingEnabled: false`，没有启用付费计费。
- 公网首页、`/dashboard`、`/library`、文章深链及主 JS/CSS 均返回 HTTP 200，内容 SHA256 与本地构建一致；本机不经过代理访问两个域名也返回 HTTP 200。用户已确认手机可正常查看目录并阅读文章。
- 151 篇线上正文及 4 个许可/provenance 文件全部返回 HTTP 200，SHA256 与 `dist` 一致。阅读器、Markdown 样式和公式字体文件也已核验。
- 中文阅读修复包含 6 篇未编辑入门文章的中文展示副本、35 组 ARIS 中英文资料的默认语言选择和逐篇切换，以及中文标题/目录。151 篇收录正文和出处文件保持原样，个人文章不自动改写。修复通过 TypeScript 检查、105 项单元/集成测试及生产构建；390px 手机宽度下实测中文正文、公式、中英文切换和无页面横向溢出。重新发布后，公网页面与入口 JS/CSS 的 SHA256 均匹配当前构建。
- 仅发布 Hosting 静态内容；网站内 Google 登录、Firestore 个人记录同步、Render API 和 DeepSeek 调用尚未启用。Firebase CLI 的部署账号登录不等于网站内登录已经配置。

## 只发布学习资料的最短路径

内置 `/library` 的目录和获准收录的正文随 `dist` 一起发布，不需要 AI 密钥、Render 或登录即可阅读。读者只在打开一篇资料时请求该篇 Markdown；站外图片和原文链接仍依赖其原站网络。它是在线阅读站点，当前没有离线缓存功能。

`localhost:3100` 仅供本机预览。部署时使用你控制的 Firebase 项目，并将目标站点绑定到仓库配置的 `career-os` Hosting target：

```sh
npm run lint
npm test
npm run build
npm exec --yes --package=firebase-tools@15.31.0 -- firebase login
npm exec --yes --package=firebase-tools@15.31.0 -- firebase projects:list
# 仅创建新站点时执行；部署已有站点跳过这一行。
npm exec --yes --package=firebase-tools@15.31.0 -- firebase hosting:sites:create SITE_ID --project YOUR_PROJECT_ID
npm exec --yes --package=firebase-tools@15.31.0 -- firebase target:apply hosting career-os SITE_ID --project YOUR_PROJECT_ID
npm exec --yes --package=firebase-tools@15.31.0 -- firebase deploy --only hosting:career-os --project YOUR_PROJECT_ID
```

将 `YOUR_PROJECT_ID` 和 `SITE_ID` 换成明确属于自己的项目与站点。`target:apply` 会在本地 `.firebaserc` 保存项目和站点映射；该文件已被 Git 忽略，每台部署机都需自行运行此命令生成映射。部署已有站点时跳过 `hosting:sites:create`，并确认 `career-os` 指向需要更新的站点。

最后一个命令会实际发布公开内容。发布后使用命令返回的 HTTPS 地址，在手机蜂窝网络打开 `/library`、直接打开某篇并刷新，核对正文/公式/目录/来源链接；可使用浏览器的“添加到主屏幕”。

仅 Hosting 不会让访客笔记自动跨设备同步。需要自己的笔记和复习记录在手机、电脑间共享时，再按下节配置 Firebase Google Auth、Firestore 和安全规则，重建发布前端并在两台设备登录同一账号。不要在聊天、仓库或前端配置中放服务账号私钥或 DeepSeek Key。

### Firebase CLI 登录排错

浏览器完成 Google 授权后，CLI 仍提示 `Your credentials are no longer valid`，也可能是 CLI 连接 Google OAuth 服务超时。Firebase CLI 15.31.0 会将 token 交换的网络异常转换成这个提示；不能仅凭提示认定账号有误。远程授权码流程也需要访问 token 服务，切换登录方式不能解决网络不通。

如果你已配置可信的本地 HTTP 代理，先确认它能连接 Google，再仅为当前 PowerShell 终端及其子进程设置代理。把下面的端口占位符换成自己的代理端口；在 AI 代理终端中显式传入 `--interactive`，启用 localhost 回调和交互登录：

```powershell
$env:HTTPS_PROXY = 'http://127.0.0.1:YOUR_PROXY_PORT'
$env:HTTP_PROXY = $env:HTTPS_PROXY
npm exec --yes --package=firebase-tools@15.31.0 -- firebase login --reauth --interactive
```

CLI 从上述环境变量读取代理，不会自动沿用浏览器代理。关闭该终端即可结束这次进程级设置；不要使用 `setx` 或修改系统代理，也不要禁用 TLS 证书校验。连通后重新授权，再用 `firebase login:list` 确认 CLI 已保存登录账号。

## 1. Firebase

1. 使用你自己的 Firebase 项目，创建 Web App，启用 Authentication → Google；在 Authorized domains 添加实际 Hosting 域名、自定义域名及本地调试的 localhost。
2. 创建 Firestore 数据库，建议使用 `(default)`。已有命名数据库需同时指定前端 `VITE_FIREBASE_DATABASE_ID`，并将 `firebase.json` 中的 firestore 配置改为含 `database` / `rules` 的对应条目后再发布规则，避免只更新默认库。
3. 在本地 `.env` 填入 Web App 的公开配置；不要从原型的 `firebase-applet-config.json` 猜项目归属。已有数据先备份，检查不完整/孤儿记录，见 [迁移说明](ARCHITECTURE.md#数据兼容与迁移)。

| 前端变量（构建时） | 值 |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase Web App 的公开 API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | 项目 Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | 实际项目 ID |
| `VITE_FIREBASE_APP_ID` | Web App ID |
| `VITE_FIREBASE_DATABASE_ID` | 默认 `(default)` |
| `VITE_API_BASE_URL` | Render 服务 HTTPS URL，末尾不需要 `/api` |

**公开配置不等于访问授权**；业务权限由 Auth 与 Firestore rules 控制。四个必需 Firebase 变量不完整时，前端保持访客可用，登录显示未配置。

## 2. Render Web Service

连接 GitHub 仓库和准备发布的分支，创建 Node Web Service。选择 Free 实例（费用/可用性以控制台为准），先手动部署验证。

| 设置 | 值 |
| --- | --- |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Node | `NODE_VERSION=22` |
| Runtime | `NODE_ENV=production` |
| Port | 使用 Render 注入的 `PORT`，监听 `0.0.0.0` |

`--include=dev` 确保部署构建时 esbuild 等编译工具存在。API 服务无需配置前端 `VITE_*`；Firebase Hosting 的前端单独构建。Express 自带的静态 SPA 用于本地验证，Render 的主要职责是 API。[Render 官方 Express 部署说明](https://render.com/docs/deploy-node-express-app)

在 Render Environment 中设置：

| 服务端变量 | 作用 |
| --- | --- |
| `AI_PROVIDER` | 默认 `deepseek`；需要 Gemini 时显式设为 `gemini` |
| `DEEPSEEK_API_KEY` | 默认供应商的私密 key，只放服务端 |
| `DEEPSEEK_MODEL` | 默认 `deepseek-flash`，当前对应 DeepSeek-V4.1-Flash |
| `GEMINI_API_KEY` | 仅选择 `gemini` 时需要；不会作为自动 fallback |
| `GEMINI_MODEL` | Gemini 主模型默认 `gemini-3.5-flash`；按账号可用模型选择 |
| `GEMINI_PRO_MODEL` / `GEMINI_LITE_MODEL` | 仅 Gemini 可选；未填写则都使用 Gemini 主模型 |
| `FIREBASE_PROJECT_ID` | 与浏览器登录使用同一个 Firebase 项目 |
| `GOOGLE_APPLICATION_CREDENTIALS` | `/etc/secrets/firebase-admin.json` |
| `AI_ALLOWED_UIDS` | 允许使用 AI 的 Firebase UID，逗号分隔；空值禁用 AI |
| `ALLOWED_ORIGINS` | 完整前端 origin，逗号分隔，无路径/尾斜杠；例如你的 `.web.app`、`.firebaseapp.com` 和自定义域名 |
| `TRUST_PROXY_HOPS` | Render 为 `1`；直接本地服务为 `0` |

DeepSeek 请求固定发送到官方 `https://api.deepseek.com/chat/completions`，不支持自定义代理地址。Standard / Deep / Fast 档位均使用 `DEEPSEEK_MODEL`，显式关闭 thinking，输出上限 4096 tokens，30 秒超时，无自动重试或跨供应商 fallback。结构化任务使用 JSON 模式、提示词字段约束和服务端 Zod 校验。模型名以 [官方发布说明](https://api-docs.deepseek.com/news/news260910/) 为依据，请求参数见 [Chat Completions 文档](https://api-docs.deepseek.com/api/create-chat-completion/)。

当前 DeepSeek 接入不提供联网搜索；前端禁用搜索，后端拒绝搜索请求。Google grounding 只在显式选择 Gemini 时可用。

Admin 凭证作为 Render **Secret File** `firebase-admin.json` 上传；使用你控制的项目服务账号及支持 Auth 用户查询的权限。不要提交私钥，不要加 `VITE_` 前缀。Render 将 secret file 挂载到 `/etc/secrets/<filename>`。[Render secrets 文档](https://render.com/docs/configure-environment-variables)

服务使用 Application Default Credentials 和 `verifyIdToken(token, true)`；需要同项目 token，撤销/禁用用户会被拒绝。没有凭证时健康检查仍通过，但付费 AI 无法验证身份。[Firebase Admin token 验证](https://firebase.google.com/docs/auth/admin/verify-id-tokens)

## 3. 发布前端和规则

需要 AI 服务时，先把实际 Render URL 写入前端 `.env` 的 `VITE_API_BASE_URL`，重新构建。Firebase 项目始终在命令参数指定，本地 `.firebaserc` 映射不提交。首次使用新站点时，先执行上方的 `hosting:sites:create`；以下命令发布已存在的站点并更新规则：

```sh
npm ci
npm run lint
npm test
npm run test:emulator
npm run build
npm exec --yes --package=firebase-tools@15.31.0 -- firebase login
npm exec --yes --package=firebase-tools@15.31.0 -- firebase target:apply hosting career-os SITE_ID --project YOUR_PROJECT_ID
npm exec --yes --package=firebase-tools@15.31.0 -- firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
npm exec --yes --package=firebase-tools@15.31.0 -- firebase deploy --only hosting:career-os --project YOUR_PROJECT_ID
```

`firebase.json` 将 `dist` 作为静态目录，所有 SPA 路径 rewrite 到 `index.html`，`--only hosting:career-os` 仅发布指定 target 对应的站点。[Firebase Hosting 官方步骤](https://firebase.google.com/docs/hosting/quickstart)

## 4. 联通验收

- 打开 `/api/health` 应返回 `{"status":"ok"}`。它只说明进程存活，不代表 Firebase 或模型凭证有效。
- 打开公开的 `/api/capabilities`，确认 `provider`、`model`、`webSearch` 和 `configured` 与部署配置一致。`configured` 只表示已填写模型 Key，不代表 Key 有效或 Firebase/UID 授权已完成；该接口不调用付费模型。
- 直接打开并刷新 `/knowledge/<真实ID>`；前进、后退可恢复页面。
- 登录 Google，Settings 显示当前 UID；将需要使用 AI 的 UID 加入 Render allowlist 并重启/重新部署。
- 账号 A 创建记录，刷新确认持久化；切换账号 B 不得看到 A 记录；退出后恢复独立访客数据。
- 网络中 `/api/copilot/*` 携带 Bearer token；无 token 401、未授权 UID 403、非法 origin 403、超限 429。
- 发送一次短 AI 请求，检查实际结果和 `modelUsed`。DeepSeek 下确认搜索开关不可用、手动提交搜索请求被拒绝；Gemini 下的搜索来源必须来自 provider metadata。
- 检查请求失败时页面保留编辑内容、显示错误；不出现伪造的同步/AI 成功提示。

## 5. 运行边界与排障

当前限流为单进程内存：IP 每分钟 60 次（认证前），UID 每分钟 10 / 每日 100 次，全服务每日 300 次。重启清零，多实例不共享；必须同时在模型供应商侧设置适合自己的额度/预算。Free 服务的休眠/冷启动可能导致第一次请求超时，界面允许重试；不要宣称服务有生产 SLA。扩展为多人长期使用前应配置持久配额、监控与故障恢复。

401：检查同一 Firebase 项目、Admin 凭证、token 撤销状态。403：检查 UID allowlist 或完整 origin。503：检查 allowlist/key。502：核对模型对当前账号是否可用、配额及服务日志。Firestore permission-denied：确认最新规则发布到正确数据库，查询具有 userId，关联父记录属于同一用户。

`.env` 由 dotenv 供服务端读取；Vite 可以读取 `.env.local`，但独立生产服务不会自动读取 `.env.local`。服务端统一使用 `.env` 或平台环境变量。改变 `VITE_*` 必须重建前端，改变服务端变量必须重启服务。

回滚用上一版 Git commit 重新构建并发布；无自动数据迁移。规则回滚可能重新打开已修复的权限漏洞，应优先修复兼容数据，不能无审查退回原型规则。
