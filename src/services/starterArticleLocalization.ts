import type { KnowledgeArticle } from '../types';
import { SEED_ARTICLES } from './seedData';

type StarterArticleTranslation = Pick<KnowledgeArticle, 'title' | 'subcategory' | 'tags' | 'summary' | 'contentMarkdown'>;

// Reading copies only. Keep the original seed fields unchanged so older saved
// starter articles can be recognized without overwriting personal edits.
export const STARTER_ARTICLE_TRANSLATIONS: Readonly<Record<string, StarterArticleTranslation>> = {
  'Self-Attention & Scaled Dot-Product': {
    title: '自注意力与缩放点积注意力',
    subcategory: '注意力机制',
    tags: ['Transformer', 'Self-Attention', '数学', '复杂度'],
    summary: '推导缩放点积注意力的数学表达式，解释为什么除以 sqrt(d_k)，并分析计算与显存复杂度。',
    contentMarkdown: String.raw`# 自注意力与缩放点积注意力

## 1. 数学表达式

缩放点积注意力（Scaled Dot-Product Attention）使用查询向量匹配键向量，再对值向量加权求和，得到一组序列表示：

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

其中：
* $Q \in \mathbb{R}^{N \times d_k}$ 是查询矩阵（Query）。
* $K \in \mathbb{R}^{M \times d_k}$ 是键矩阵（Key）。
* $V \in \mathbb{R}^{M \times d_v}$ 是值矩阵（Value）。
* $d_k$ 是查询和键投影后的维度。

## 2. 为什么要除以 $\sqrt{d_k}$？

假设 $q$ 和 $k$ 的各分量都是相互独立的随机变量，均值为 $0$、方差为 $1$：

$$\mathbb{E}[q_i] = 0, \quad \text{Var}(q_i) = 1$$
$$\mathbb{E}[k_i] = 0, \quad \text{Var}(k_i) = 1$$

点积为 $S = q \cdot k = \sum_{i=1}^{d_k} q_i k_i$。
$S$ 的均值为：
$$\mathbb{E}[S] = \sum_{i=1}^{d_k} \mathbb{E}[q_i k_i] = 0$$

$S$ 的方差为：
$$\text{Var}(S) = \sum_{i=1}^{d_k} \text{Var}(q_i k_i) = \sum_{i=1}^{d_k} \mathbb{E}[q_i^2]\mathbb{E}[k_i^2] = d_k$$

当 $d_k$ 增大，例如取 $64$ 或 $128$ 时，点积的方差也随之增大到 $d_k$。过大的点积容易让 softmax 进入梯度极小的饱和区域，使反向传播中的梯度变得很小。

除以 $\sqrt{d_k}$ 后，方差恢复为 $1$：
$$\text{Var}\left(\frac{S}{\sqrt{d_k}}\right) = \frac{1}{d_k} \text{Var}(S) = 1$$

## 3. 计算与显存复杂度

下面考虑序列长度为 $N$ 的自注意力，即 $M=N$：
* **时间复杂度：** 矩阵乘法 $QK^T$ 需要 $O(N^2 d_k)$，softmax 需要 $O(N^2)$，再与 $V$ 相乘需要 $O(N^2 d_v)$。总体为 $O(N^2 d)$。
* **空间复杂度：** 显式保存 $N \times N$ 的注意力矩阵需要 $O(N^2)$ 空间。这种随序列长度平方增长的显存开销，是长上下文处理中的主要瓶颈之一。
`,
  },
  'RoPE (Rotary Position Embedding)': {
    title: 'RoPE：旋转位置编码',
    subcategory: '位置编码',
    tags: ['RoPE', 'LLaMA', '数学', '位置编码'],
    summary: '通过二维坐标旋转理解 RoPE，推导相对位置信息如何进入注意力内积，并介绍长上下文缩放思路。',
    contentMarkdown: String.raw`# RoPE：旋转位置编码

RoPE（Rotary Position Embedding，Su 等，2021）是一种常用于 LLaMA、Mistral、Qwen 等大语言模型的位置编码方法。

## 1. 核心动机

绝对位置编码，例如正弦位置编码或可学习的一维位置向量，通常将位置向量加到词向量上：
$$x_m = w_m + p_m$$

我们希望自注意力内积 $q_m^T k_n$ 中的位置关系由相对距离 $m-n$ 表达，而不是分别依赖绝对坐标 $m$ 和 $n$。内积仍然依赖查询和键的内容。

## 2. 数学定义

RoPE 将向量的二维子空间看作复数，并在复平面上旋转查询向量和键向量：

$$R_{\Theta, m}^d = \text{diag}\left(R_{\theta_1, m}, R_{\theta_2, m}, \dots, R_{\theta_{d/2}, m}\right)$$

其中，每个二维旋转块为：
$$R_{\theta_i, m} = \begin{pmatrix} \cos(m\theta_i) & -\sin(m\theta_i) \\ \sin(m\theta_i) & \cos(m\theta_i) \end{pmatrix}$$

旋转频率为 $\theta_i = b^{-2(i-1)/d}$。原始设定的基数为 $b=10000$；一些扩展上下文的模型采用更大的基数，例如 $500000$。

## 3. 内积中的相对位置关系

旋转后的向量内积满足：
$$\langle R_m q, R_n k \rangle = q^T R_m^T R_n k = q^T R_{n-m} k = g(q, k, m-n)$$

因此，位置信息通过相对位移进入注意力得分。RoFormer 论文还分析了所选旋转频率带来的远距离衰减性质。

> **旧入门稿勘误：** 相对位置恒等式并不保证任意一对 $q,k$ 的注意力得分都随 $|m-n|$ 单调下降。二维旋转含有周期性的正弦和余弦项；应区分论文讨论的远距离衰减性质与单个内积的变化。参见 [RoFormer 原论文第 3.3、3.4.3 节](https://arxiv.org/html/2104.09864v5)。

## 4. 长上下文缩放

* **线性插值（Linear Interpolation）：** 按上下文扩展比例 $\alpha=L/L_{orig}$ 缩放位置索引。
* **NTK-aware Scaled RoPE：** 修改基频参数 $b$，而不是对位置 $m$ 做统一的线性缩放；其思路是在拉伸低频部分的同时，尽量保留高频部分对局部位置的分辨能力。
`,
  },
  'KV Cache & Attention Variants (MHA, MQA, GQA)': {
    title: 'KV Cache 与注意力变体（MHA、MQA、GQA）',
    subcategory: '推理优化',
    tags: ['KV Cache', 'GQA', 'MQA', '推理', '吞吐量'],
    summary: '理解自回归解码中 KV Cache 的作用，计算其显存占用，并比较 MHA、MQA 与 GQA 的共享方式。',
    contentMarkdown: String.raw`# KV Cache 与注意力变体（MHA、MQA、GQA）

## 1. 为什么需要 KV Cache

在自回归文本生成中，模型根据已有的 $x_{1:t-1}$ 预测下一个 token $x_t$。如果不使用缓存，每一步都要重新计算此前所有 token 的 Key 和 Value 投影；生成 $T$ 个 token 时，仅这些重复投影的次数就会随 $O(T^2)$ 增长。

将 Key 和 Value 张量缓存在 GPU 的高带宽显存（HBM）后，每个解码步只需计算当前新输入 token 的 $q_t,k_t,v_t$，把 $k_t,v_t$ 追加到缓存，再用当前查询访问已有的键和值，无需重复计算此前 token 的投影。

## 2. KV Cache 显存公式

设每个缓存元素占 $p$ 字节，例如 FP16/BF16 的 $p=2$。对于这里讨论的标准 MHA、MQA 或 GQA，每条序列、每个 token 的 KV Cache 占用为：

$$\text{Memory per Token} = 2 \times n_{\text{layers}} \times n_{\text{kv\_heads}} \times d_{\text{head}} \times \text{precision (bytes)}$$

前面的 $2$ 分别对应 Key 和 Value 两份缓存。数据精度占用已经由最后一项计入，不应再额外乘一次 $2$。

**算例：使用 LLaMA-2 70B 的层数与查询头维度，假设采用标准 MHA。**
* $n_{\text{layers}}=80$。
* $n_{\text{heads}}=64, d_{\text{head}}=128$。
* 在这个 MHA 假设下，$n_{\text{kv\_heads}}=64$，缓存精度为 2 字节：

$$\text{Per Token} = 2 \times 80 \times 64 \times 128 \times 2 = 2,621,440\ \text{bytes} \approx 2.62\ \text{MB}$$

若每条序列为 4,000 个 token，batch size 为 16，则：

$$2,621,440 \times 4000 \times 16 = 167,772,160,000\ \text{bytes} \approx 167.77\ \text{GB}$$

这里 MB、GB 按十进制计算。该数值仅是缓存开销；判断模型能否部署，还需要计入模型权重、运行时激活和其他显存开销。

> **旧入门稿勘误：** 原公式在已经计入精度字节数后又多乘了一个 $2$，导致每 token 的 5.24 MB 和总计 335 GB 都翻倍。因此，原稿“仅 KV Cache 就超过 4 张 80 GB GPU”的结论也不成立。上面按 Key、Value 两个张量的形状重新计算；参见 [Hugging Face 缓存存储说明](https://huggingface.co/docs/transformers/main/cache_explanation#cache-storage-implementation)。

## 3. 注意力变体比较

* **MHA（Multi-Head Attention，多头注意力）：** $n_q=n_{kv}$，每个 Query 头有独立的 Key、Value 头，表达方式灵活，但 KV Cache 占用较大。
* **MQA（Multi-Query Attention，多查询注意力）：** 所有 Query 头共享一组 Key、Value 头，即 $n_{kv}=1$。与相同配置的 MHA 相比，KV Cache 可缩小到原来的 $1/n_q$，例如 $n_q=64$ 时缩小 64 倍，但模型质量可能下降。
* **GQA（Grouped-Query Attention，分组查询注意力）：** 把 $n_q$ 个 Query 头划分为 $G$ 组，每组共享一个 KV 头，即 $n_{kv}=G$，例如取 8。它在质量和推理效率之间提供折中；[GQA 原论文](https://arxiv.org/abs/2305.13245)报告了接近 MHA 的质量与接近 MQA 的速度，实际表现仍取决于模型和配置。
`,
  },
  'LoRA & QLoRA Parameter-Efficient Fine-Tuning': {
    title: 'LoRA 与 QLoRA：参数高效微调',
    subcategory: '模型微调',
    tags: ['LoRA', 'QLoRA', 'PEFT', '量化', 'SFT'],
    summary: '从低内在维度假设出发，理解 LoRA 的 A/B 低秩矩阵，以及 QLoRA 的 NF4、双重量化和分页优化器。',
    contentMarkdown: String.raw`# LoRA 与 QLoRA：参数高效微调

## 1. LoRA：低秩适配

LoRA（Low-Rank Adaptation）的出发点是：模型适配特定任务时，参数更新 $\Delta W$ 可以具有较低的内在维度（Aghajanyan 等，2020）。

对于预训练权重矩阵 $W_0 \in \mathbb{R}^{d \times k}$，LoRA 冻结 $W_0$，把更新量 $\Delta W$ 分解为两个低秩矩阵的乘积：

$$W = W_0 + \Delta W = W_0 + \frac{\alpha}{r} (B \times A)$$

其中：
* $B \in \mathbb{R}^{d \times r}$，初始化为 0。
* $A \in \mathbb{R}^{r \times k}$，使用高斯分布 $\mathcal{N}(0,\sigma^2)$ 初始化。
* $r \ll \min(d,k)$ 是秩，常见取值为 $r \in \{8,16,32,64\}$。
* $\alpha$ 是控制缩放幅度的常数超参数。

### 为什么把 $B$ 初始化为 0？

在训练开始时，$\Delta W=B\times A=0\times A=0$，因此适配分支尚未改变预训练模型的输出。这样可以从原模型的行为开始训练，避免一开始就引入额外扰动。

## 2. QLoRA 的关键创新

QLoRA（Dettmers 等，2023）结合以下技术，在论文实验中实现了用单张 48 GB GPU 微调 65B 参数模型：

1. **NF4（NormalFloat 4）：** 面向正态分布神经网络权重设计的分位数量化数据类型，目标是在这一分布假设下获得信息论意义上的高效表示。
2. **双重量化（Double Quantization，DQ）：** 对量化常数本身再次量化，每个参数可进一步节省约 $0.37$ 比特。
3. **分页优化器（Paged Optimizers）：** 利用 CUDA 统一内存管理机制，缓解梯度检查点和优化器状态分配期间的内存峰值，减少显存溢出风险。
`,
  },
  'Hybrid Retrieval & Reciprocal Rank Fusion (RRF)': {
    title: '混合检索与倒数排名融合（RRF）',
    subcategory: '检索与排序',
    tags: ['RAG', 'BM25', '稠密检索', 'RRF', '重排序'],
    summary: '结合稀疏关键词检索与稠密语义检索，理解分数尺度差异，以及 RRF 如何使用排名进行融合。',
    contentMarkdown: String.raw`# 混合检索与倒数排名融合（RRF）

## 1. 为什么采用混合检索？

* **稠密语义检索（Dense Retrieval，例如 BGE-M3、OpenAI text-embedding-3）：** 擅长处理同义词、上下文语义和跨语言改写，但对标识符、代码 token、缩写或罕见产品编号的精确匹配可能不够可靠。
* **稀疏词法检索（Sparse Retrieval，例如 BM25）：** 擅长匹配精确关键词和专业术语，但仅依赖词面匹配时，容易漏掉同义词和不同表述。
* **混合检索（Hybrid Retrieval）：** 融合两种检索方式，使语义理解与精确匹配形成互补。

## 2. 倒数排名融合（RRF）

直接合并 BM25 原始分数与向量相似度分数会遇到尺度问题：两者的分布没有经过校准。常见非负 BM25 实现的分数没有统一的固定上界，而余弦相似度在 $[-1,1]$ 范围内。

RRF（Reciprocal Rank Fusion）通过融合**排名**而不是原始分数，绕开不同检索系统的分数校准问题：

$$RRF\_Score(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}$$

其中：
* $M$ 是检索通道的集合，例如 [BM25, Dense]。
* $r_m(d)$ 是文档 $d$ 在系统 $m$ 中的排名，从 1 开始计数。
* $k$ 是平滑常数，常见默认值为 $k=60$。

### 为什么经常取 $k=60$？

常数 $k$ 可以减弱头部排名之间的分数差距，避免排名第一的结果过度主导融合。例如：
* 当 $k=0$ 时，第 1 名得分为 $\frac{1}{1}=1.0$，第 2 名为 $\frac{1}{2}=0.5$，相差 50%。
* 当 $k=60$ 时，第 1 名得分为 $\frac{1}{61}\approx0.01639$，第 2 名为 $\frac{1}{62}\approx0.01612$，差距约为 1.6%。

在 $k=60$、两个通道等权且未检出文档不计分的例子中，同时出现在两个系统第 5 名的文档，可以超过只在一个系统排第 1、另一个系统未检出的文档。这体现了 RRF 对跨通道一致性的利用。
`,
  },
  'Agent Architecture: ReAct, Tools & Memory': {
    title: 'Agent 架构：ReAct、工具调用与记忆',
    subcategory: '自主智能体',
    tags: ['Agent', 'ReAct', '工具调用', '记忆', '规划'],
    summary: '理解 ReAct 中推理与行动交替的工作方式、工具调度，以及工作上下文、情景记忆和长期知识的分工。',
    contentMarkdown: String.raw`# Agent 架构：ReAct、工具调用与记忆

## 1. ReAct 模式：推理与行动结合

ReAct（Reasoning + Acting）由 Yao 等在 2022 年提出，将推理步骤与执行动作交替组织：

$$\text{Thought} \to \text{Action} \to \text{Observation} \to \text{Thought} \dots$$

也就是“思考 → 行动 → 观察 → 再思考”的循环：根据当前信息选择动作，读取工具或环境返回的结果，再决定下一步。

### 为什么不只执行动作？

只执行动作的 Agent 缺少用于拆解多跳问题的中间工作区，可能过早调用工具，或生成缺少依据的工具参数。推理步骤可以帮助组织任务、检查假设并安排后续动作。

### 为什么不只进行推理？

只在模型内部进行推理，无法直接访问最新的外部事实，也无法与 API 交互。面对不断变化的数据时，仅依赖已有知识容易产生错误；工具返回的观察结果可以为后续处理提供外部依据。

## 2. Agent 的记忆层次

1. **工作上下文（短期记忆）：** 当前上下文窗口中的系统提示、近期对话、工具定义，以及最近的观察结果。
2. **情景记忆（Episodic Memory）：** 记录过去任务的执行过程、用户反馈和成功方案，常通过语义向量检索再次调用。
3. **语义记忆（长期知识）：** 保存结构化档案、知识图谱和持续有效的用户偏好。

## 3. 反思与自我修正

* **Reflexion（Shinn 等）：** 将失败尝试后的自我评估和反思保存在记忆缓冲区中，为下一次迭代提供参考，减少重复犯错。
`,
  },
};

const normalizeLineEndings = (value: string | undefined) => value?.replace(/\r\n/g, '\n');
const sourceFields = ['title', 'category', 'subcategory', 'summary', 'contentMarkdown'] as const;

function matchesStarter(article: KnowledgeArticle, starter: (typeof SEED_ARTICLES)[number]): boolean {
  return sourceFields.every(field => normalizeLineEndings(article[field]) === normalizeLineEndings(starter[field]))
    && article.tags.length === starter.tags.length
    && article.tags.every((tag, index) => normalizeLineEndings(tag) === normalizeLineEndings(starter.tags[index]));
}

/** Localize unedited built-in study articles without changing any stored record. */
export function localizeStarterArticle(article: KnowledgeArticle, language: 'zh' | 'en'): KnowledgeArticle {
  if (language !== 'zh') return article;
  const starter = SEED_ARTICLES.find(candidate => matchesStarter(article, candidate));
  if (!starter) return article;
  const translation = STARTER_ARTICLE_TRANSLATIONS[starter.title];
  if (!translation) return article;
  return { ...article, ...translation, tags: [...translation.tags] };
}
