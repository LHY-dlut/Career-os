# AI Career OS (AI 算法与大模型求职操作系统)

<p align="center">
  <img src="public/assets/aistudio/hero_banner.png" alt="AI Career OS Preview" width="850" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);" />
</p>

<p align="center">
  <strong>专为大语言模型 (LLM)、检索增强生成 (RAG)、智能体 (Agent) 与 AI 算法工程打造的个人一体化求职与技术成长操作系统</strong>
</p>

<p align="center">
  <a href="#项目定位">项目定位</a> •
  <a href="#功能特性">当前功能</a> •
  <a href="#系统架构">项目架构</a> •
  <a href="#技术栈">技术栈</a> •
  <a href="#本地运行">本地运行</a> •
  <a href="#环境变量">环境变量</a> •
  <a href="#roadmap">Roadmap</a>
</p>

---

## 🎯 项目定位

**AI Career OS** 不是通用的个人博客，也不是走马观花的静态 Demo，而是一个面向 **LLM / RAG / Agent / AI 算法工程师求职者** 的专业闭环工作流系统。

核心解决痛点：
1. **知识碎片化**：大模型技术演进极快（Attention、RoPE、FlashAttention、KV Cache、vLLM、ZeRO、MoE），各类公式和论文解析散落在各处，缺乏结构化沉淀。
2. **答题无条理**：技术面试中无法在 30 秒黄金时间内完成清晰有力的结构化表达（Elevator Pitch）。
3. **遗忘曲线陡峭**：背过的面经和底层公式几天后即遗忘，缺乏科学的艾宾浩斯间隔复习机制。
4. **投递流程混乱**：面试家数增多后，无法系统跟踪各家进度、岗位 JD 核心考点与每轮真题复盘。

### 🔄 核心闭环飞轮

```
知识沉淀 (Knowledge) ➔ 核心题库 (Question Bank) ➔ 手撕算法 (Coding Lab)
        ▲                                                      ▼
  查漏补缺 (Gap Fix)  艾宾浩斯复习 (Spaced Review)  面试复盘 (Retrospective)
                               ▲                               ▼
                       流程追踪 (Job CRM)  真实面试 (Interviews)
```

---

## 📸 功能截图展示

| 1. 结构化技术知识库 (Markdown + LaTeX) | 2. 艾宾浩斯间隔复习卡片 (Anki SM-2) |
| :---: | :---: |
| ![Knowledge Base](public/assets/aistudio/screenshot_knowledge.png) | ![Anki Review](public/assets/aistudio/screenshot_review.png) |
| *支持 LaTeX 数学公式渲染、目录跳转、Markdown 导入导出* | *基于 SuperMemo-2 算法，根据回忆熟练度动态计算下次复习周期* |

| 3. 面试投递管道看板 (Job CRM) | 4. 多轮 Gemini 算法副驾驶 (AI Copilot) |
| :---: | :---: |
| ![Job CRM Pipeline](public/assets/aistudio/screenshot_crm.png) | ![AI Copilot](public/assets/aistudio/screenshot_copilot.png) |
| *看板化追踪投递、笔试、一二三面、HR面与 Offer* | *集成 4 大面试角色、Pro 深度数学推导与 Google Search 实时联网检索* |

---

## 🚀 当前功能

### 1. 结构化技术体系知识库 (Knowledge Base)
- **六大主流领域全覆盖**：
  - `Transformer & Attention`（多头注意力、RoPE 旋转位置编码、KV Cache 计算推导）
  - `LLM Inference & Systems`（vLLM、PagedAttention、投机采样、连续批处理、INT4/FP8 量化）
  - `Distributed Training`（3D 并行、ZeRO-1/2/3 内存卸载、Megatron-LM 张量切分）
  - `Advanced RAG Architecture`（混合检索 BM25 + Dense、重排序 Rerank、RAG 评测指标）
  - `Autonomous Agent System`（ReAct 循环、Tool Use、Memory 架构、Reflection 自省机制）
  - `Evaluation & Alignment`（RLHF、DPO 优化推导、红蓝对抗安全基准）
- **学术级渲染**：基于 `KaTeX` 的数学公式解析（支持行内 `$..$` 与块级 `$$..$$`）及代码高亮。
- **双向 Markdown 导入与导出**：
  - 单篇导出包含 YAML Frontmatter 元数据。
  - 支持多篇 Markdown 一键批量导出及拖拽导入。
- **实时联网学术检索 (Google Search Grounding)**：
  - 基于 `gemini-3.5-flash` 与 Google Search 工具，一键检索目标主题的 2024~2025 最新顶会论文、SOTA 实现方案及真实出处引用。

### 2. 艾宾浩斯题库与闪卡复习 (Question Bank & Anki Review)
- **30 秒电梯演讲 (Elevator Pitch) 框架**：每道题均配备「30秒破题概述 + 核心公式定理 + 详细论述 + 高频追问预测」。
- **SM-2 记忆算法引擎**：
  - 评级选项：`Again (重来)` / `Hard (困难)` / `Good (良好)` / `Easy (简单)`。
  - 自动更新复习轮次、遗忘因子（EF）与下一次复习到期时间。
- **进度雷达与复盘状态流**：实时掌握“待复习”、“学习中”与“已掌握”题目比例。

### 3. AI 算法工程师手撕代码本 (Coding Practice Lab)
- **手撕大模型核心组件**：
  - Scaled Dot-Product Attention 实现
  - Rotary Positional Embedding (RoPE) 复现
  - Paged KV-Cache 分块内存计算
  - Top-P (Nucleus) 与 Top-K 采样算子
  - LoRA 权重注入与参数冻结 Forward 逻辑
  - Reciprocal Rank Fusion (RRF) 倒数排名融合算法
- **交互练习台**：支持复杂度标注、核心要点踩分点提示与自测逻辑。

### 4. 岗位申请与流程看板 (Job Application CRM)
- **全流程 Kanban 看板**：
  - 意向 (Wishlist) ➔ 已投递 (Applied) ➔ 笔试/测评 (Screening) ➔ 技术一面/二面/终面 (Technical) ➔ HR/Offer ➔ 复盘/归档 (Archived)。
- **核心维度管理**：记录薪资范畴、内推渠道、投递时间线及当前重点跟进事项。

### 5. 深度面试复盘库 (Interview Retrospective)
- **实战真题记录**：按公司、轮次、题目分类记录现场被问及的考题。
- **自评与短板诊断**：标记现场发挥、逻辑卡点、盲区标签（Knowledge Gap）。
- **知识库联动**：复盘发现的盲区可一键直达对应知识库文章进行强化巩固。

### 6. 多轮多角色 Gemini 求职副驾驶 (AI Copilot)
- **4 种专属面试官角色**：
  - 🎓 **AI Career & Tech Mentor**（综合答疑与学习路径指引）
  - 🔬 **Deep System & Algorithm Bar Raiser**（基于 `gemini-3.1-pro-preview`，深挖数学证明、显存带宽极限与分布式切分）
  - ⚡ **Rapid Drill & Flashcard Coach**（基于 `gemini-3.1-flash-lite`，高频快问快答与临考突击）
  - 🌐 **AI Research & Industry Scout**（集成 Google Search Grounding，追踪前沿论文架构与大厂真题）
- **30秒演讲润色器 (Answer Polisher)**：将零散思考草稿快速重构为逻辑紧凑的 30 秒高分回答。
- **JD 智能拆解器 (JD Analyzer)**：粘贴岗位要求一键提炼核心考点、考察权重与定制准备清单。

### 7. 主题与无缝体验
- **Deep Slate 专业暗黑主题**：专为长时间编码与文档阅读调优的高对比度暗黑界面，搭配精致优雅的字体层级（Plus Jakarta Sans + JetBrains Mono）。
- **云端持久化存储**：无缝支持 Firebase Firestore 存储用户自定义文章、题目、投递与复盘数据。

---

## 🛠️ 技术栈

| 领域 | 核心技术 | 选用说明 |
| :--- | :--- | :--- |
| **前端框架** | React 19 + TypeScript | 强类型安全保障，支持最新 React 19 并发特性 |
| **构建与开发** | Vite 8 + TSX | 毫秒级极速冷启动与热重载 |
| **样式与动效** | Tailwind CSS v4 + Motion | 现代原子化样式规范与流畅的微交互动效 |
| **Markdown & 数学** | React Markdown + KaTeX + GFM | 完整支持 LaTeX 论文公式与表格代码高亮 |
| **服务端** | Node.js + Express 4.x | 轻量高效的服务端路由，隔离安全凭证 |
| **大模型 SDK** | `@google/genai` (Official SDK) | 原生调用 Gemini 3.5 / 3.1 系列模型与搜索工具 |
| **数据库/持久化** | Firebase Firestore + Local Fallback | 生产级云端数据库，兼备离线本地容灾回退 |
| **图标库** | Lucide React | 统一风格的现代化矢量图标集 |

---

## 🏗️ 项目架构

```
ai-career-os/
├── .env.example                 # 环境变量配置模板
├── index.html                   # HTML 根入口 (SEO, OpenGraph, KaTeX CDN)
├── metadata.json                # 应用元数据声明
├── package.json                 # 依赖包及脚本管理
├── server.ts                    # 生产环境自托管 Express 服务入口
├── vite.config.ts               # 开发环境 Vite 配置与 API 中间件
├── public/                      # 静态资源目录
└── src/
    ├── main.tsx                 # React 应用根挂载
    ├── App.tsx                  # 核心路由、导航切换与全局状态流
    ├── index.css                # Tailwind CSS 根样式定义
    ├── types.ts                 # 全局 TypeScript 接口定义 (Article, Card, Job, Review)
    ├── components/              # 业务复用组件
    │   ├── common/              # 通用组件 (MarkdownRenderer, Toast, Header)
    │   └── knowledge/           # 知识库专用组件 (MarkdownImportModal, etc.)
    ├── pages/                   # 核心页面模块
    │   ├── Overview.tsx         # 求职全貌仪表盘
    │   ├── Knowledge.tsx        # 体系知识库与联网文献速查
    │   ├── QuestionBank.tsx     # 高频题库与 Anki 闪卡复习
    │   ├── CodingNotebook.tsx   # 算法工程师手撕代码本
    │   ├── JobTracker.tsx       # 岗位投递看板 (CRM)
    │   ├── Retrospectives.tsx   # 面试真题复盘与反思库
    │   └── AICopilot.tsx        # 多轮 Gemini 面试官与答题润色台
    ├── server/                  # 服务端代理逻辑
    │   ├── apiRouter.ts         # Express /api/* 路由调度
    │   └── geminiService.ts     # Google GenAI 交互封装与搜索 Grounding
    ├── services/                # 前端数据交互与 Firestore 封装
    │   ├── db.ts                # 本地与 Firestore 混合持久化层
    │   ├── firebase.ts          # Firebase Client SDK 初始化
    │   └── aiCopilot.ts         # 前端调用 AI 后端 API Client
    └── utils/                   # 算法与辅助函数
        ├── spacedRepetition.ts  # SuperMemo SM-2 间隔复习算法实现
        └── markdownFrontmatter.ts # Markdown 与 YAML Frontmatter 解析序列化工具
```

---

## 💻 本地运行指南

### 前置要求
- **Node.js**: `v20.0.0` 或更高版本
- **包管理器**: `npm`, `pnpm` 或 `bun`
- **Google Gemini API Key** (从 [Google AI Studio](https://aistudio.google.com/) 免费获取)

### 1. 克隆代码仓库
```bash
git clone https://github.com/your-username/ai-career-os.git
cd ai-career-os
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
复制环境变量示例文件并填写你的 Gemini API Key：
```bash
cp .env.example .env
```
编辑 `.env` 文件：
```env
GEMINI_API_KEY="your_actual_gemini_api_key_here"
```

### 4. 启动本地开发服务
```bash
npm run dev
```
打开浏览器访问：**`http://localhost:3000`** 即可使用完整的 AI Career OS。

### 5. 编译构建与生产部署
```bash
# 静态资源与服务端构建
npm run build

# 启动生产服务
npm run start
```

---

## 🔑 环境变量说明

在 `.env` 中支持如下环境变量：

| 变量名 | 是否必填 | 作用描述 |
| :--- | :---: | :--- |
| `GEMINI_API_KEY` | **是** | Google Gemini API 密钥，用于驱动多轮 Copilot、答题润色与搜索增强 |
| `APP_URL` | 否 | 当前应用部署域名（容器与 Cloud Run 环境自动注入） |
| `NODE_ENV` | 否 | 运行环境（`development` / `production`） |

---

## 🗺️ Roadmap (未来规划)

- [x] **v1.0 核心基石**
  - [x] 结构化体系知识库 (KaTeX 公式支持)
  - [x] 基于 SM-2 的题库与闪卡复习系统
  - [x] LeetCode & LLM 核心手撕代码本
  - [x] 投递流程看板 (Job CRM) 与面试真题复盘
  - [x] 多轮 Gemini AI 求职副驾驶与多角色切换
  - [x] Google Search Grounding 实时前沿文献搜索
  - [x] Markdown 导入导出与 Deep Slate 暗黑主题
- [ ] **v1.1 体验与生态拓展**
  - [ ] 知识库支持一键导出为个人 PDF/HTML 知识手册
  - [ ] 增加语音面试模拟 (Gemini Live API 对话模式)
  - [ ] 增加各大厂（字节、阿里、腾讯、美团、百度、OpenAI、Anthropic）面试考题专属标签包
  - [ ] 支持在线 Python 解释器沙箱执行手撕算法
  - [ ] 移动端 PWA 离线复习支持

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 开源。欢迎 Star、Fork 并提交 PR 一起完善大模型求职技术基建！
