# 课程资料与双轨训练实施计划

基线：`refactor/codex-foundation` / `110fe393e48f6ae25d48bd070a949f2931370653`，2026-09-25 开始时工作区干净。该提交与上一轮中文阅读发布使用相同产品代码；本轮开始再次比对公网构建文件，结果记录在最终报告。不会从旧 main 重新开发。

## 保留与范围

保留 React/Vite/Router、现有身份与 Repository/WorkspaceActions、资料 ID、私人笔记链接、Markdown/KaTeX/锚点、双语与主题、求职和复习功能。公共教材与私人数据分开。本轮不发布生产、不合并 main、不建设远程代码执行服务。

## A：内容诊断与课程导航

- 对照目录、来源路径/provenance、本地正文、dist 与线上响应，记录逐资源证据到 CONTENT_GAPS；区分完整教材、原始提纲、原站入口、缺失文件与 HTML fallback。
- 在人工编排覆盖层组织学习路线和来源课程，扩展现有目录树、面包屑、上下篇与阅读布局；保持 ID/URL/语言与锚点兼容。

## B：内容与训练工作流

- 核验力扣官方 Hot100 100 题，10 个原创完整训练包，其余明确索引状态。
- 14 项 PyTorch 训练，6 个教学单元按实际缺口复用或单独补充；官方文档/论文参考和 CPU 数值、mask、offset、增量一致性测试。
- 首页与 /coding 共用按需加载 TrainingWorkspace。草稿按身份/taskId/language 隔离，防抖与显式保存；练习记录通过现有仓库原子保存个人题目快照和 attempt，不批量写入公共题库。

## C：验收

- lint、typecheck、完整测试、build；相关数据关系运行 Firestore 模拟器；Python/PyTorch 实测。
- 1440/1024/390px、深色模式；目录自然排序、hash 深链、语言/上下篇；首页与训练页切题/刷新草稿、查看题解、练习记录与身份隔离。
- 更新 CONTENT_SOURCES、ARCHITECTURE、CONTENT_GAPS 和 LIBRARY_TRAINING_REPORT；记录真实统计、截图、未核验项与发布/回滚步骤。交付可审查代码和本地预览。

## 实施结果

已在 `feat/library-curriculum-training` 完成增量；实现、实际统计、139 项应用测试、6 项规则测试、Python/PyTorch 实测、浏览器截图和未核验项见 [LIBRARY_TRAINING_REPORT](LIBRARY_TRAINING_REPORT.md)。初次按计划交付预览，随后用户明确要求上线，应用提交 `f062d13` 已于 2026-09-25 发布到原 Hosting 站点。未合并分支或更改云端私人数据。
