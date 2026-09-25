# Roadmap

每个版本以真实数据和可验证闭环为验收条件。第一轮完成 v0.2 工程基础；随后按用户偏好实现中英切换、AIInfraGuide 风格的学习门户和有授权出处的静态资料库。当前资料收录范围见 [CONTENT_SOURCES.md](CONTENT_SOURCES.md)，公网发布仍需用户自己的 Firebase 项目和登录。业务闭环和检索工作继续按下列顺序推进。

| 版本 | 范围 | 验收 |
| --- | --- | --- |
| v0.1 Gemini Prototype | Gemini / AI Studio 生成的原始产品，Git 历史保留 | 基线 `7e7b59b` |
| v0.2 Foundation | Audit、路由、数据层、身份隔离、备份、安全 API、构建/CI/文档 | 本地质量门禁通过；真实云端验收单独跟踪 |
| v0.3 Career Loop | Link Existing Question、Interview Occurrences、复习历史、投递跟进、编码题维护 | 一条真实面试题可以关联、复习、追踪历史；无伪造指标 |
| v0.4 Learning & Copilot | 分层学习路径与阅读体验；Answer Coach 保存回题库；JD 真实关联；完整 mock 会话；本地知识上下文 | AI 结果可追溯、失败可重试、用户确认后沉淀业务数据 |
| v0.5 Retrieval | 用真实积累数据评估检索、引用命中与成本，再决定 BM25 / dense / RRF / reranker | 有固定评估集与基线收益，才引入向量库 |
| v1.0 Daily Use | 云端端到端测试、备份恢复演练、可访问性、移动端与稳定运行 | 可长期日用，具备观测与故障恢复 |

## 四个参考网站：三方面都采用

用户确认同时需要阅读体验、内容组织、视觉设计；保持 Career OS 的学习→复习→求职闭环。

| 参考 | 计划借鉴 | 首轮与后续 |
| --- | --- | --- |
| [卡码 LLM 面试](https://notes.kamacoder.com/interview/llm/) | 专题/章节、面试问题入口、短答案到深入解释 | 首轮稳定文章/题目链接；后续 Domain→Topic→Question 内容树 |
| [AIInfraGuide](https://caomaolufei.github.io/AIInfraGuide/) | 顶部导航、居中首屏、内容分区、分类卡片与阅读目录 | 已落地学习门户、真实文章数量、最近更新、分类 URL 与阅读布局；个性化学习路径后续实现 |
| [labuladong](https://labuladong.online/zh/algo/essential-technique/algorithm-summary/) | 章节导航、正文目录、代码框架、关联阅读 | 首轮共享 heading ID、公式/代码、前后篇；后续阅读列宽/目录定位与章节树完善 |
| [ARIS in AI Offer](https://wanshuiyin.github.io/ARIS-in-AI-Offer/) | 主题卡片、难度筛选、搜索、阅读标记、明暗主题 | 首轮修复搜索与主题；后续速查卡、真实阅读历史、统一信息层级 |

视觉方向保留 slate / sky / indigo，采用用户偏好的 AIInfraGuide 门户布局，增强留白、正文层级和移动端导航。内容来自用户积累或明确许可来源；MIT 允许复用的第一方教程按固定版本收录，其他来源仅建立原文导航。当前已覆盖学习首页与知识阅读，后续按实际使用反馈统一题库和求职页面的视觉细节。

## 下一轮建议

优先将资料阅读前端发布到用户自己的 Firebase Hosting，供手机通过公网阅读；个人笔记跨设备同步另需 Auth/Firestore 联通。随后验证 Render/DeepSeek 并完成 v0.3 的 InterviewQuestion ↔ Question 双向闭环。内容更新需先复核上游许可；阅读进度同步和个性化路线独立推进。
