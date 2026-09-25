# 学习资料来源与更新

核查日期：2026-09-25。学习库将允许复用的教程正文作为静态 Markdown 随本站发布，阅读时按篇加载；其余资料保留原文导航。资料与用户自己的知识笔记、复习记录分开保存。

## 当前范围

| 来源 | 本站保存 | 许可与边界 |
| --- | --- | --- |
| [AIInfraGuide](https://caomaolufei.github.io/AIInfraGuide/) | `docs/guides/**/*.md` 的 81 篇指南及章节提纲 | 固定版本 README 明示 MIT；完整保留该声明，随附 MIT 标准许可条款。 |
| [ARIS-in-AI-Offer](https://wanshuiyin.github.io/ARIS-in-AI-Offer/) | 35 个第一方教程主题的中文、英文，共 70 篇 | 仓库 MIT LICENSE 明确允许复制、修改、分发，保留原版权与许可全文。 |
| [卡码笔记 · 大模型面试](https://notes.kamacoder.com/interview/llm/) | 28 个目录及文章导航入口 | 未确认全文转载授权；本站不保存其教程正文。 |
| [labuladong · 算法笔记](https://labuladong.online/zh/algo/essential-technique/algorithm-summary/) | 用户指定的算法总结文章入口 | [官方条款](https://labuladong.online/zh/terms/)限制未经许可的抓取与转载；本站不保存其教程正文。 |

合计 151 篇站内全文、29 个原文入口。全文 Markdown 约 6.8 MB，单篇读取，不打进应用 JavaScript。这里的“全文”指所列固定版本 Markdown 文件的正文，不表示上游已经完成所有规划章节。

目录默认跟随界面语言，为 ARIS 的每个主题选择一个对应版本；中文模式显示 116 篇站内文章及 29 个原文入口。可在“资料语言”选择中文、英文或全部版本，阅读页也可切换同篇的中英文。没有对应译文的来源继续保留原稿。选择只影响目录和阅读，不删减已保存的 151 个文件。

## AIInfraGuide

- 仓库：[caomaolufei/AIInfraGuide](https://github.com/caomaolufei/AIInfraGuide)。
- 固定版本：`a3b63eeb81d6d36a3c42c8cfc5a1bdd96e36bab1`。
- 作者归属：草帽路飞（caomaolufei）及 AIInfraGuide contributors。
- 授权证据：[该版本 README 的 License 段](https://github.com/caomaolufei/AIInfraGuide/blob/a3b63eeb81d6d36a3c42c8cfc5a1bdd96e36bab1/README.md#license)，内容为 `MIT`。
- 上游该版本没有独立 LICENSE 文件，也没有在许可声明处给出版权年份。本项目不补造上游版权行；在 `public/library/licenses/aiinfra-guide-MIT.txt` 明确区分标准 MIT 文本和上游 README 声明，原 README 存于同目录 `aiinfra-guide-README.md`。
- 收录 `docs/guides/` 下全部 81 个 Markdown 文件：学习路线、前置知识、CUDA 与算子优化、分布式训练、推理优化。部分文件本身是章节提纲，原样保留。
- 不连带复制 `docs/interview/` 的 181 个聚合面经、`docs/posts/`、第三方参考网站、外部论文、网站 UI 源码或脚本。仓库可见不自动扩大到外部作品的授权。

## ARIS-in-AI-Offer

- 仓库：[wanshuiyin/ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)。
- 固定版本：`22e73822f8636ee3b52de1da6f6d2e03d1f51d4e`。
- 原版权行：`Copyright (c) 2026 Ruofeng Yang (杨若峰)`。
- 许可原文：[固定版本 LICENSE](https://github.com/wanshuiyin/ARIS-in-AI-Offer/blob/22e73822f8636ee3b52de1da6f6d2e03d1f51d4e/LICENSE)，逐字保存于 `public/library/licenses/aris-ai-offer-MIT.txt`。
- [README](https://github.com/wanshuiyin/ARIS-in-AI-Offer/blob/22e73822f8636ee3b52de1da6f6d2e03d1f51d4e/README.md) 的 Community Showcase 明确欢迎保留署名的教程复用。
- 收录 `docs/tutorials/*_tutorial.md` 及 `*_tutorial_en.md`，35 主题、70 文件。原始标题取自上游 `tools/tutorials_render_manifest.json`，中文显示标题另存 `aris-titles-zh.json`；正文公式、代码块、问答和引用保留。中英文通过明确的语言、主题组与对应版本 ID 关联。
- 不复制社区外链题库、个人主页、博客、HTML 脚本、技能指令或可执行 Python 工具。教程正文中的代码只作文字展示，不执行。

## 图片、链接与正文转换

- 每篇都有作者、固定版本的原文件链接、MIT 许可链接。
- 只将 YAML frontmatter 转为目录元数据、补充文档标题和来源说明、改写站内文章/章节链接，将 HTML `img` 改成 Markdown 图片；不改写、删减或生成替代教学正文。
- 已收录教程之间的链接转为 `/library/<id>`，目录锚点适配本站 `heading-` 规则。未收录的相对代码/参考链接转为固定版本 GitHub 原文件链接。
- 中文阅读时可显示中文主标题及通用目录标签，渲染器仍使用原正文生成的锚点 ID，因此原有章节链接继续有效。技术缩写、公式和代码保持原样。
- 40 处插图引用仍由原站或原文列出的第三方站点提供。本站没有下载任何图片，因此离线或原图站不可用时，插图可能不显示；正文、公式与代码仍在本站。
- 外部参考链接保持来源关系；收录教程不代表本项目验证了其中每个技术事实或取得引用作品的再发布权。

## 可复现导入

从仓库根目录运行：

```sh
node scripts/import-learning-library.mjs
```

仅调整语言配对或中文显示标题时，可运行 `node scripts/import-learning-library.mjs --metadata-only`，离线重建目录元数据，不下载或改写正文及 provenance。

脚本只处理上述两个白名单仓库的固定 commit，下载允许的 Markdown、标题元数据和授权文件，不执行上游代码。每个文件有 2 MB 上限；读取 GitHub tree 后核对 Git blob SHA-1，只有完整性验证通过才转换写入。

- 导入目录：`src/content/library/imported-catalog.json`。
- 来源元数据：`src/content/library/imported-sources.json`。
- 正文：`public/library/<id>.md`。
- 逐篇原路径、上游 Git blob、输出 SHA-256 与字节数：`public/library/licenses/provenance.json`。
- 临时已校验下载缓存：忽略提交的 `output/library-upstream/`。

更新时先审查新版本许可和导入范围，再显式更改脚本里的固定 commit 与核查日期，运行导入和学习库契约测试，并检查导入差异。脚本不跟踪浮动 `main`，不自动扩大收录目录，也不会修改个人学习数据。若未来删去资源，需要单独审查并移除对应的旧正文文件；导入器不会递归删除目录。
