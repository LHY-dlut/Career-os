import type {
  KnowledgeArticle,
  Question,
  CodingProblem,
  Application,
  Interview,
  ReviewHistory,
} from '../types';

export const SEED_ARTICLES: Omit<KnowledgeArticle, 'id' | 'userId'>[] = [
  {
    title: 'Self-Attention & Scaled Dot-Product',
    category: '01 Transformer',
    subcategory: 'Attention Mechanisms',
    tags: ['Transformer', 'Self-Attention', 'Math', 'Complexity'],
    summary: 'Mathematical breakdown of Scaled Dot-Product Attention, variance scaling by sqrt(d_k), and computational complexity.',
    contentMarkdown: `# Self-Attention & Scaled Dot-Product Attention

## 1. Mathematical Formulation

Scaled Dot-Product Attention computes a sequence of representations by querying keys and aggregating values:

$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$

Where:
* $Q \\in \\mathbb{R}^{N \\times d_k}$ (Query matrix)
* $K \\in \\mathbb{R}^{M \\times d_k}$ (Key matrix)
* $V \\in \\mathbb{R}^{M \\times d_v}$ (Value matrix)
* $d_k$ is the dimensionality of key/query projections.

## 2. Why divide by $\\sqrt{d_k}$?

Assume elements of $q$ and $k$ are independent random variables with mean $0$ and variance $1$:

$$\\mathbb{E}[q_i] = 0, \\quad \\text{Var}(q_i) = 1$$
$$\\mathbb{E}[k_i] = 0, \\quad \\text{Var}(k_i) = 1$$

The dot product is $S = q \\cdot k = \\sum_{i=1}^{d_k} q_i k_i$.
The mean of $S$ is:
$$\\mathbb{E}[S] = \\sum_{i=1}^{d_k} \\mathbb{E}[q_i k_i] = 0$$

The variance of $S$ is:
$$\\text{Var}(S) = \\sum_{i=1}^{d_k} \\text{Var}(q_i k_i) = \\sum_{i=1}^{d_k} \\mathbb{E}[q_i^2]\\mathbb{E}[k_i^2] = d_k$$

As $d_k$ grows large (e.g. $d_k = 64$ or $128$), the variance of the dot product scales up to $d_k$. Large dot products push the softmax function into regions with extremely tiny gradients (saturation), leading to vanishing gradients during backpropagation.

Dividing by $\\sqrt{d_k}$ scales the variance back to $1$:
$$\\text{Var}\\left(\\frac{S}{\\sqrt{d_k}}\\right) = \\frac{1}{d_k} \\text{Var}(S) = 1$$

## 3. Computational & Memory Complexity
* **Time Complexity:** Matrix multiplication $QK^T$ requires $O(N^2 d_k)$, softmax requires $O(N^2)$, and multiplication with $V$ requires $O(N^2 d_v)$. Overall: $O(N^2 d)$.
* **Space Complexity:** Storing the $N \\times N$ attention matrix incurs quadratic memory $O(N^2)$, which is the primary bottleneck for long contexts.
`,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'RoPE (Rotary Position Embedding)',
    category: '01 Transformer',
    subcategory: 'Positional Encodings',
    tags: ['RoPE', 'LLaMA', 'Math', 'Positional Encoding'],
    summary: 'How Rotary Position Embedding encodes relative positional information through complex coordinate rotations.',
    contentMarkdown: `# RoPE: Rotary Position Embedding

RoPE (Su et al., 2021) is the standard positional encoding method used in modern LLMs including LLaMA, Mistral, and Qwen.

## 1. Core Motivation
Absolute positional embeddings (like sinusoidal or learnable 1D embeddings) add positional vectors to word vectors:
$$x_m = w_m + p_m$$
However, self-attention dot product $q_m^T k_n$ should ideally depend only on the relative distance $m - n$, rather than absolute coordinates $m$ and $n$.

## 2. Mathematical Definition
RoPE represents 2D subspaces as complex numbers and rotates the query and key vectors in the complex plane:

$$R_{\\Theta, m}^d = \\text{diag}\\left(R_{\\theta_1, m}, R_{\\theta_2, m}, \\dots, R_{\\theta_{d/2}, m}\\right)$$

Where each 2D rotation block is:
$$R_{\\theta_i, m} = \\begin{pmatrix} \\cos(m\\theta_i) & -\\sin(m\\theta_i) \\\\ \\sin(m\\theta_i) & \\cos(m\\theta_i) \\end{pmatrix}$$
with frequency $\\theta_i = b^{-2(i-1)/d}$, where base $b = 10000$ (or up to $500000$ in extended context models).

## 3. Inner Product Invariance
The dot product between rotated vectors satisfies:
$$\\langle R_m q, R_n k \\rangle = q^T R_m^T R_n k = q^T R_{n-m} k = g(q, k, m-n)$$

Thus, the attention score naturally decays as distance $|m - n|$ increases.

## 4. Long Context Scaling
* **Linear Interpolation:** Scales position index by ratio $\\alpha = L / L_{orig}$.
* **NTK-aware Scaled RoPE:** Modifies the base frequency $b$ instead of linearly scaling $m$, preserving high-frequency local positional resolution while stretching low frequencies.
`,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'KV Cache & Attention Variants (MHA, MQA, GQA)',
    category: '01 Transformer',
    subcategory: 'Inference Optimization',
    tags: ['KV Cache', 'GQA', 'MQA', 'Inference', 'Throughput'],
    summary: 'Memory footprint analysis of autoregressive decoding, KV Cache arithmetic, and Multi-Query vs Grouped-Query Attention.',
    contentMarkdown: `# KV Cache & Multi-Query / Grouped-Query Attention

## 1. Why KV Cache is Essential
During autoregressive text generation, at step $t$, the model generates token $x_t$ given $x_{1:t-1}$.
Without caching, Key and Value projections for all prior tokens $1 \\dots t-1$ must be recomputed at every step, causing $O(T^2)$ computational overhead for generating $T$ tokens.

By caching Key and Value tensors in GPU High Bandwidth Memory (HBM), token $t$ only computes its own $q_t, k_t, v_t$, appends $k_t, v_t$ to the cache, and attends over the cached keys and values.

## 2. KV Cache Memory Formula
For precision $p$ bytes (e.g. 2 bytes for FP16/BF16):

$$\\text{Memory per Token} = 2 \\times 2 \\times n_{\\text{layers}} \\times n_{\\text{kv\\_heads}} \\times d_{\\text{head}} \\times \\text{precision (bytes)}$$

**Example (LLaMA-2 70B):**
* $n_{\\text{layers}} = 80$
* $n_{\\text{heads}} = 64, d_{\\text{head}} = 128$
* If standard MHA ($n_{\\text{kv\\_heads}} = 64$):
$$\\text{Per Token} = 4 \\times 80 \\times 64 \\times 128 \\times 2 = 5,242,880 \\text{ bytes} \\approx 5.24 \\text{ MB}$$
For 4,000 tokens and batch size 16:
$$5.24 \\text{ MB} \\times 4000 \\times 16 \\approx 335 \\text{ GB}$$
This exceeds the total GPU VRAM of 4x A100 (80GB)!

## 3. Comparison of Attention Variants
* **MHA (Multi-Head Attention):** $n_{q} = n_{kv}$. Maximum expressiveness, but enormous KV cache memory consumption.
* **MQA (Multi-Query Attention):** Single Key and Value head shared across all Query heads ($n_{kv} = 1$). Reduces KV cache by a factor of $n_{q}$ (e.g. 64x), but can suffer slight degradation on complex reasoning.
* **GQA (Grouped-Query Attention):** Partitions $n_{q}$ heads into $G$ groups, each group sharing one KV head ($n_{kv} = G$, e.g., 8). Strikes the optimal balance: retains MHA quality while achieving near-MQA memory efficiency and generation speed.
`,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'LoRA & QLoRA Parameter-Efficient Fine-Tuning',
    category: '02 LLM',
    subcategory: 'Fine-Tuning',
    tags: ['LoRA', 'QLoRA', 'PEFT', 'Quantization', 'SFT'],
    summary: 'Intrinsic rank hypothesis, low-rank decomposition matrices A and B, 4-bit NormalFloat (NF4), and double quantization.',
    contentMarkdown: `# LoRA & QLoRA Fine-Tuning

## 1. LoRA (Low-Rank Adaptation)
Based on the hypothesis that parameter updates $\\Delta W$ during task-specific adaptation have a low intrinsic dimension (Aghajanyan et al., 2020).

For a pre-trained weight matrix $W_0 \\in \\mathbb{R}^{d \\times k}$, LoRA freezes $W_0$ and decomposes $\\Delta W$ into two low-rank matrices:
$$W = W_0 + \\Delta W = W_0 + \\frac{\\alpha}{r} (B \\times A)$$

Where:
* $B \\in \\mathbb{R}^{d \\times r}$ (initialized to 0)
* $A \\in \\mathbb{R}^{r \\times k}$ (initialized with Gaussian $\\mathcal{N}(0, \\sigma^2)$)
* $r \\ll \\min(d, k)$ is the rank (typically $r \\in \\{8, 16, 32, 64\\}$)
* $\\alpha$ is a constant scaling hyperparameter.

### Why initialize $B=0$?
At the beginning of training, $\\Delta W = B \\times A = 0 \\times A = 0$, ensuring the model output begins identically to the pre-trained model with zero disruption.

## 2. QLoRA Innovations
QLoRA (Dettmers et al., 2023) allows fine-tuning a 65B model on a single 48GB GPU by combining:
1. **NF4 (NormalFloat 4):** An information-theoretically optimal quantile quantization data type for normally distributed neural network weights.
2. **Double Quantization (DQ):** Quantizing the quantization constants themselves, saving $\\approx 0.37$ bits per parameter.
3. **Paged Optimizers:** Using CUDA unified memory to prevent out-of-memory spikes during gradient checkpointing and optimizer state allocation.
`,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Hybrid Retrieval & Reciprocal Rank Fusion (RRF)',
    category: '03 RAG',
    subcategory: 'Retrieval & Ranking',
    tags: ['RAG', 'BM25', 'Dense Retrieval', 'RRF', 'Reranker'],
    summary: 'Combining sparse keyword search with dense semantic embeddings, score normalization challenges, and RRF rank fusion.',
    contentMarkdown: `# Hybrid Retrieval & Reciprocal Rank Fusion (RRF)

## 1. Why Hybrid Retrieval?
* **Dense Semantic Retrieval (e.g. BGE-M3, OpenAI text-embedding-3):** Excellent at understanding synonyms, contextual semantics, and multilingual paraphrases. Fails at exact identifier lookups, code tokens, acronyms, or rare product IDs.
* **Sparse Lexical Retrieval (BM25):** Excels at exact keywords and specific terms, but cannot handle lexical mismatch (synonyms, paraphrase).
* **Hybrid Retrieval:** Fuses both systems to get the best of both worlds.

## 2. Reciprocal Rank Fusion (RRF)
Directly combining raw scores from BM25 and vector similarity is problematic because their score distributions are uncalibrated (BM25 unbounded $[0, \\infty)$, cosine similarity in $[-1, 1]$).

RRF bypasses score calibration by fusing **ranks** rather than raw scores:

$$RRF\\_Score(d) = \\sum_{m \\in M} \\frac{1}{k + r_m(d)}$$

Where:
* $M$ is the set of retrieval channels (e.g. [BM25, Dense]).
* $r_m(d)$ is the 1-based rank of document $d$ in system $m$.
* $k$ is a smoothing constant (standard default is $k = 60$).

### Why $k = 60$?
The constant $k$ prevents top-ranked documents from completely dominating. For example:
* If $k = 0$, rank 1 gets $\\frac{1}{1}=1.0$, while rank 2 gets $\\frac{1}{2}=0.5$ (a 50% drop).
* If $k = 60$, rank 1 gets $\\frac{1}{61} \\approx 0.01639$, while rank 2 gets $\\frac{1}{62} \\approx 0.01612$ (a modest 1.6% drop).
This ensures a document appearing at rank 5 in both systems outscores a document that appeared at rank 1 in only one system and was missed by the other.
`,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Agent Architecture: ReAct, Tools & Memory',
    category: '04 Agent',
    subcategory: 'Autonomous Agents',
    tags: ['Agent', 'ReAct', 'Tool Calling', 'Memory', 'Planning'],
    summary: 'Core agentic patterns: interleaving reasoning traces and actions, tool dispatching, short-term vs long-term memory.',
    contentMarkdown: `# Agent Architecture: ReAct, Tool Calling & Memory

## 1. ReAct Pattern (Reasoning + Acting)
Introduced by Yao et al. (2022), ReAct interleaves chain-of-thought reasoning with execution actions:

$$\\text{Thought} \\to \\text{Action} \\to \\text{Observation} \\to \\text{Thought} \\dots$$

### Why Not Action-Only?
Action-only agents lack an internal scratchpad to decompose multi-hop questions, leading to premature tool invocations and hallucinated arguments.

### Why Not Thought-Only?
Thought-only models cannot ground themselves in external up-to-date facts or interact with APIs, causing hallucinations on dynamic data.

## 2. Agent Memory Hierarchy
1. **Working Context (Short-term):** The system prompt, immediate conversation messages, tool schemas, and recent observation outputs within the context window.
2. **Episodic Memory:** Records past task trajectories, user feedback, and successful past plans (often indexed with semantic vector retrieval).
3. **Semantic Memory (Long-term Knowledge):** Structured profile data, knowledge graphs, and persistent user preferences.

## 3. Reflection & Self-Correction
* **Reflexion (Shinn et al.):** Maintains a memory buffer of self-evaluative reflections from failed execution trials to avoid repeating errors in subsequent iterations.
`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const SEED_QUESTIONS: Omit<Question, 'id' | 'userId'>[] = [
  {
    title: 'Why does scaled dot-product attention divide by sqrt(d_k)?',
    category: 'Transformer',
    difficulty: 'Medium',
    tags: ['Self-Attention', 'Variance', 'Softmax', 'Math'],
    conciseAnswer: 'To prevent the dot products from growing excessively large for large dimensions d_k, which would push the softmax function into regions of extremely small gradients (gradient vanishing).',
    detailedAnswer: `Assuming query components q_i and key components k_i are independent random variables with zero mean and unit variance:
E[q_i] = 0, Var(q_i) = 1
E[k_i] = 0, Var(k_i) = 1

Their dot product S = sum_{i=1}^{d_k} q_i * k_i has expectation 0 and variance d_k.
For large d_k (e.g. 64 or 128), values of S can be substantially greater than 1 or smaller than -1.
When large inputs enter the softmax function, the resulting probability distribution becomes sharp (approaching a one-hot vector), and the softmax derivative approaches 0.
Dividing by sqrt(d_k) normalizes the variance of the dot product back to 1, ensuring stable gradients throughout training.`,
    followUps: [
      'What happens if we divide by d_k instead of sqrt(d_k)?',
      'How does layer normalization interact with attention score scaling?',
      'Does FlashAttention change this scaling calculation?',
    ],
    relatedKnowledgeArticles: ['Self-Attention & Scaled Dot-Product'],
    masteryLevel: 'Reviewing',
    intervalDays: 7,
    lastReviewedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    nextReviewAt: new Date(Date.now() + 86400000 * 5).toISOString(),
    reviewCount: 3,
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'What is the difference between MHA, MQA and GQA?',
    category: 'Transformer',
    difficulty: 'Medium',
    tags: ['MHA', 'GQA', 'MQA', 'Inference', 'KV Cache'],
    conciseAnswer: 'MHA maintains dedicated Key and Value heads for every Query head; MQA shares a single KV head across all Query heads; GQA groups Query heads into clusters where each cluster shares one KV head.',
    detailedAnswer: `1. Multi-Head Attention (MHA):
- n_q heads, n_k = n_q, n_v = n_q.
- High representation capability, but largest KV cache size and lowest inference decoding throughput.

2. Multi-Query Attention (MQA):
- n_q heads, n_k = 1, n_v = 1.
- Dramatically cuts KV cache memory by factor of n_q (e.g., 32x or 64x) and bandwidth pressure, but can cause minor quality degradation on nuanced reasoning.

3. Grouped-Query Attention (GQA):
- Partitions n_q query heads into G groups (e.g. G = 8).
- Each group has n_q / G query heads sharing 1 key head and 1 value head.
- Provides comparable speed and memory reduction to MQA while matching MHA quality (standard in LLaMA-2 70B, LLaMA-3, Mistral).`,
    followUps: [
      'How does GQA impact training memory vs inference memory?',
      'Can you convert a pre-trained MHA model to GQA (Uptraining)?',
      'Why is autoregressive inference memory-bandwidth bound rather than compute bound?',
    ],
    relatedKnowledgeArticles: ['KV Cache & Attention Variants (MHA, MQA, GQA)'],
    masteryLevel: 'Learning',
    intervalDays: 3,
    lastReviewedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    nextReviewAt: new Date(Date.now() + 86400000 * 2).toISOString(),
    reviewCount: 2,
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Why does KV Cache accelerate autoregressive inference?',
    category: 'Inference',
    difficulty: 'Easy',
    tags: ['KV Cache', 'Autoregressive', 'Decoding', 'Complexity'],
    conciseAnswer: 'Because past tokens in autoregressive generation do not change, caching their Key and Value tensors avoids redundant recomputation, reducing single-step computation from O(T^2) to O(T).',
    detailedAnswer: `In transformer causal self-attention, token at position t attends to tokens 1 ... t.
Without KV cache:
At generation step t, the model must feed all t tokens through all layers, computing Q, K, V for all t tokens.
Generating N tokens requires sum_{t=1}^N O(t^2 * d) = O(N^3 * d) operations.

With KV cache:
Key and Value vectors for tokens 1 ... t-1 are loaded from cache. Only token t computes q_t, k_t, v_t.
k_t and v_t are concatenated to the cache. q_t attends over cached keys and values in O(t * d).
Generating N tokens takes sum_{t=1}^N O(t * d) = O(N^2 * d) total operations.`,
    followUps: [
      'What is PagedAttention and how does vLLM solve KV cache fragmentation?',
      'How does prompt caching (Prefix Caching) work on top of KV Cache?',
    ],
    relatedKnowledgeArticles: ['KV Cache & Attention Variants (MHA, MQA, GQA)'],
    masteryLevel: 'Mastered',
    intervalDays: 14,
    lastReviewedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    nextReviewAt: new Date(Date.now() + 86400000 * 11).toISOString(),
    reviewCount: 5,
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'What problem does RRF solve in hybrid retrieval?',
    category: 'RAG',
    difficulty: 'Medium',
    tags: ['RAG', 'Hybrid Retrieval', 'BM25', 'RRF', 'Ranking'],
    conciseAnswer: 'RRF solves the score calibration and distribution incompatibility problem between sparse lexical search (unbounded BM25 scores) and dense vector search (bounded cosine similarity) by fusing ordinal ranks instead of raw numerical scores.',
    detailedAnswer: `Dense embedding models output similarity scores typically in [-1, 1] or [0, 1].
BM25 yields unbounded non-negative scores dependent on document length and term frequencies (e.g. 5.4, 22.1).
Linearly combining alpha * BM25 + beta * Dense requires exhaustive hyperparameter tuning per dataset and breaks whenever query length or corpus statistics change.

Reciprocal Rank Fusion (RRF) uses only the position rank:
RRF_Score(d) = sum_{m in M} 1 / (k + rank_m(d))
Default k = 60 smooths rank differentials so high rankings from multiple systems beat a single outlier rank.`,
    followUps: [
      'How does RRF compare to learned Cross-Encoder rerankers?',
      'Can you combine RRF with reciprocal score thresholding?',
    ],
    relatedKnowledgeArticles: ['Hybrid Retrieval & Reciprocal Rank Fusion (RRF)'],
    masteryLevel: 'Unseen',
    intervalDays: 1,
    reviewCount: 0,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Why is a reranker usually placed after retrieval in RAG pipelines?',
    category: 'RAG',
    difficulty: 'Easy',
    tags: ['RAG', 'Reranker', 'Cross-Encoder', 'Bi-Encoder'],
    conciseAnswer: 'Retrieval uses Bi-Encoders for fast O(1) ANN vector search over millions of documents, while Rerankers use compute-heavy Cross-Encoders with full token-level self-attention over the top-K candidates to achieve maximum ranking accuracy.',
    detailedAnswer: `1. Bi-Encoder (Dense Retrieval):
- Encodes Query and Document independently: score = dot(f(Q), f(D)).
- Enables pre-computing all document vectors and sub-millisecond retrieval via HNSW / ScaNN.
- Trade-off: No cross-token interaction between question and passage words during encoding.

2. Cross-Encoder (Reranker):
- Feeds concatenation [CLS] + Query + [SEP] + Document into all Transformer layers.
- Full multi-head self-attention between every query word and every document word captures complex semantic alignment, negation, and specific condition matching.
- Cost: Quadratic in length, cannot pre-compute. Running on 1M documents is infeasible.
- Optimal pipeline: Bi-Encoder retrieves top 50-100 candidates, Cross-Encoder reranks to top 3-5 passages for LLM context generation.`,
    followUps: [
      'What are ColBERT and Late-Interaction models, and where do they fit?',
      'How does reranker context length affect lost-in-the-middle problems in LLMs?',
    ],
    relatedKnowledgeArticles: ['Hybrid Retrieval & Reciprocal Rank Fusion (RRF)'],
    masteryLevel: 'Reviewing',
    intervalDays: 7,
    lastReviewedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    nextReviewAt: new Date(Date.now() + 86400000 * 6).toISOString(),
    reviewCount: 3,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'What is the difference between LoRA and QLoRA?',
    category: 'LLM',
    difficulty: 'Medium',
    tags: ['LoRA', 'QLoRA', 'Quantization', 'PEFT', 'NF4'],
    conciseAnswer: 'LoRA freezes 16-bit base weights and trains low-rank adapter matrices A and B; QLoRA quantizes the base model weights to 4-bit NormalFloat (NF4) with double quantization and paged optimizers, drastically cutting VRAM requirements.',
    detailedAnswer: `LoRA:
- Base model weights W_0 are stored in FP16 or BF16 (16 bits per param).
- Trains delta_W = (alpha/r) * B * A with r << d.
- 70B model requires ~140GB VRAM just to hold the frozen weights.

QLoRA:
1. NF4 Quantization: Quantizes frozen weights to 4 bits using an information-theoretically optimal distribution for zero-mean normal weights.
2. Double Quantization: Quantizes the quantization scale factors, saving an additional 0.37 bits per parameter.
3. Paged Optimizers: Offloads memory spikes to CPU memory via CUDA Unified Memory.
4. During forward pass, NF4 weights are dequantized on-the-fly to BF16 for matrix multiplication with activations.
Result: A 70B model can be fine-tuned on two 24GB GPUs or a single 48GB GPU.`,
    followUps: [
      'Does QLoRA suffer from inference latency degradation during fine-tuning?',
      'Can LoRA weights be merged back into the base model weights for deployment?',
    ],
    relatedKnowledgeArticles: ['LoRA & QLoRA Parameter-Efficient Fine-Tuning'],
    masteryLevel: 'Learning',
    intervalDays: 3,
    lastReviewedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    nextReviewAt: new Date(Date.now() + 86400000 * 1).toISOString(),
    reviewCount: 2,
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'How does ReAct combine reasoning and action?',
    category: 'Agent',
    difficulty: 'Medium',
    tags: ['Agent', 'ReAct', 'Tool Calling', 'Planning'],
    conciseAnswer: 'ReAct dynamically interleaves explicit reasoning traces (Thoughts) with external tool calls (Actions) and environment feedback (Observations), creating a transparent, self-correcting problem-solving loop.',
    detailedAnswer: `Traditional prompting either:
- Generates pure reasoning traces (Chain-of-Thought), which suffers from lack of external knowledge and hallucinations.
- Generates pure API action commands (ACT), which fails to decompose multi-step logic or handle unexpected observation errors.

ReAct structures the prompt loop as:
1. Thought: LLM analyzes the current goal, synthesizes prior observations, and formulates what information is missing.
2. Action: LLM selects a specific tool with arguments (e.g. search("latest LLM benchmark")).
3. Observation: The runtime executes the tool and injects the actual API/system output into the conversation.
4. Cycle repeats until the Thought determines the final answer can be synthesized.`,
    followUps: [
      'How do you prevent infinite loops in ReAct execution?',
      'How does ReAct compare with Plan-and-Solve / Tree of Thoughts?',
    ],
    relatedKnowledgeArticles: ['Agent Architecture: ReAct, Tools & Memory'],
    masteryLevel: 'Reviewing',
    intervalDays: 7,
    lastReviewedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    nextReviewAt: new Date(Date.now() + 86400000 * 3).toISOString(),
    reviewCount: 4,
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'What are the differences between Agent memory and conversation history?',
    category: 'Agent',
    difficulty: 'Hard',
    tags: ['Agent', 'Memory', 'Episodic Memory', 'Long-Term Memory'],
    conciseAnswer: 'Conversation history is raw linear text FIFO appended in the prompt buffer, whereas Agent memory is a multi-tiered architecture containing working memory, episodic experiential logs, and semantic profile facts retrieved dynamically.',
    detailedAnswer: `1. Conversation History (Buffer):
- Raw messages array: [{role: 'user', content: ...}, {role: 'assistant', content: ...}].
- Linear growth, quickly exceeds context limits or degrades attention focus.
- Evaporation: Once truncated or session terminates, state is lost.

2. Agent Memory Architecture:
- Short-term (Working Memory): Actively processed context and current execution state.
- Episodic Memory: Records past task trajectories, mistakes, user confirmations, and feedback. Stored in vector/structured DB and retrieved using semantic similarity or recency decay.
- Semantic Memory: Distilled facts, entities, user preferences, and domain knowledge graphs.
- Procedural Memory: Tool execution scripts, learned skills, and validated prompt templates.`,
    followUps: [
      'How does MemGPT / Letta manage memory tiers with OS-like paging?',
      'How do you handle memory eviction and contradiction updates?',
    ],
    relatedKnowledgeArticles: ['Agent Architecture: ReAct, Tools & Memory'],
    masteryLevel: 'Learning',
    intervalDays: 3,
    lastReviewedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    nextReviewAt: new Date(Date.now() + 86400000 * 1).toISOString(),
    reviewCount: 1,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const SEED_CODING_PROBLEMS: Omit<CodingProblem, 'id' | 'userId'>[] = [
  {
    title: 'Implement Multi-Head Attention (PyTorch)',
    category: 'LLM From Scratch',
    difficulty: 'Medium',
    language: 'Python',
    problemDescription: `Implement the core forward pass of Multi-Head Attention from scratch using PyTorch.

Requirements:
1. Linear projections for Q, K, V with output dimension d_model.
2. Reshape into (batch_size, num_heads, seq_len, d_k).
3. Compute scaled dot-product attention with optional causal mask.
4. Concatenate heads and apply final output linear projection.
5. Correctly handle tensor dimensions and batching.`,
    codeTemplate: `import torch
import torch.nn as nn
import math

class MultiHeadAttention(nn.Module):
    def __init__(self, d_model: int, num_heads: int):
        super().__init__()
        assert d_model % num_heads == 0, "d_model must be divisible by num_heads"
        self.d_model = d_model
        self.num_heads = num_heads
        self.d_k = d_model // num_heads

        # Linear projections for Q, K, V and Out
        self.w_q = nn.Linear(d_model, d_model, bias=False)
        self.w_k = nn.Linear(d_model, d_model, bias=False)
        self.w_v = nn.Linear(d_model, d_model, bias=False)
        self.w_o = nn.Linear(d_model, d_model, bias=False)

    def forward(self, q, k, v, mask=None):
        # q: (batch_size, seq_len_q, d_model)
        # k: (batch_size, seq_len_k, d_model)
        # v: (batch_size, seq_len_v, d_model)
        # mask: optional (batch_size, 1, seq_len_q, seq_len_k)
        
        # TODO: Implement Multi-Head Attention forward pass
        pass
`,
    referenceSolution: `import torch
import torch.nn as nn
import math

class MultiHeadAttention(nn.Module):
    def __init__(self, d_model: int, num_heads: int):
        super().__init__()
        assert d_model % num_heads == 0, "d_model must be divisible by num_heads"
        self.d_model = d_model
        self.num_heads = num_heads
        self.d_k = d_model // num_heads

        self.w_q = nn.Linear(d_model, d_model, bias=False)
        self.w_k = nn.Linear(d_model, d_model, bias=False)
        self.w_v = nn.Linear(d_model, d_model, bias=False)
        self.w_o = nn.Linear(d_model, d_model, bias=False)

    def forward(self, q, k, v, mask=None):
        B, T_q, _ = q.shape
        _, T_k, _ = k.shape

        # 1. Linear projections and reshape to (B, num_heads, T, d_k)
        Q = self.w_q(q).view(B, T_q, self.num_heads, self.d_k).transpose(1, 2)
        K = self.w_k(k).view(B, T_k, self.num_heads, self.d_k).transpose(1, 2)
        V = self.w_v(v).view(B, T_k, self.num_heads, self.d_k).transpose(1, 2)

        # 2. Scaled Dot-Product: (B, H, T_q, d_k) @ (B, H, d_k, T_k) -> (B, H, T_q, T_k)
        scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(self.d_k)

        # 3. Apply optional mask
        if mask is not None:
            scores = scores.masked_fill(mask == 0, float("-inf"))

        # 4. Softmax and weighted sum
        attn_weights = torch.softmax(scores, dim=-1)
        out = torch.matmul(attn_weights, V) # (B, H, T_q, d_k)

        # 5. Transpose back and concatenate heads
        out = out.transpose(1, 2).contiguous().view(B, T_q, self.d_model)
        return self.w_o(out)
`,
    complexityAnalysis: `Time: O(B * H * T_q * T_k * d_k + B * T * d_model^2)
Space: O(B * H * T_q * T_k) for storing attention matrix weights.`,
    keyPitfalls: [
      'Forgetting .contiguous() before .view() after transpose.',
      'Masking with -1e9 instead of float("-inf") in FP16 can lead to numerical overflow.',
      'Transposing the wrong dimensions when splitting heads.',
    ],
    interviewExplanation: 'In interviews, emphasize the shape transitions at every step: (B, T, D) -> (B, H, T, d_k) -> (B, H, T, T) -> (B, T, D). Explain why dividing by sqrt(d_k) preserves variance.',
  },
  {
    title: 'Implement Reciprocal Rank Fusion (RRF)',
    category: 'RAG From Scratch',
    difficulty: 'Easy',
    language: 'Python',
    problemDescription: `Implement the Reciprocal Rank Fusion (RRF) algorithm to combine multiple ranked lists of document IDs.

Given:
- rankings: A list of ranked document ID lists from different retrieval algorithms (e.g. BM25 and Vector Search).
- k: The smoothing constant (default: 60).

Output:
- A sorted list of (doc_id, score) pairs in descending order of fused score.`,
    codeTemplate: `from typing import List, Tuple, Dict
from collections import defaultdict

def reciprocal_rank_fusion(
    rankings: List[List[str]],
    k: int = 60
) -> List[Tuple[str, float]]:
    # TODO: Implement RRF algorithm
    pass
`,
    referenceSolution: `from typing import List, Tuple, Dict
from collections import defaultdict

def reciprocal_rank_fusion(
    rankings: List[List[str]],
    k: int = 60
) -> List[Tuple[str, float]]:
    rrf_scores: Dict[str, float] = defaultdict(float)

    for rank_list in rankings:
        for rank_idx, doc_id in enumerate(rank_list):
            # 1-based rank
            rank = rank_idx + 1
            rrf_scores[doc_id] += 1.0 / (k + rank)

    # Sort descending by score
    sorted_docs = sorted(rrf_scores.items(), key=lambda item: item[1], reverse=True)
    return sorted_docs
`,
    complexityAnalysis: `Time: O(M * N + U log U) where M is number of lists, N is list length, and U is unique docs.
Space: O(U) for dictionary of unique document IDs.`,
    keyPitfalls: [
      'Using 0-based indexing instead of 1-based rank without adjusting the formula.',
      'Assuming all document lists are of identical length (handle partial overlaps).',
    ],
    interviewExplanation: 'Mention why RRF is scale-invariant: it discards incompatible raw metrics and ensures that documents appearing moderately high across all channels win over single-list outliers.',
  },
  {
    title: 'Implement ReAct Agent Loop',
    category: 'Agent From Scratch',
    difficulty: 'Hard',
    language: 'Python',
    problemDescription: `Implement a minimal ReAct agent execution loop in Python.
The agent must execute steps:
1. Parse LLM response for Thought and Action (tool_name, tool_input) or Final Answer.
2. Execute tool from registered tool dispatcher.
3. Append Observation to message memory.
4. Stop when Final Answer is reached or max_iterations exceeded.`,
    codeTemplate: `from typing import Callable, Dict, Any, Optional

class ReActAgent:
    def __init__(self, tools: Dict[str, Callable[[str], str]], max_iterations: int = 5):
        self.tools = tools
        self.max_iterations = max_iterations

    def run(self, query: str, llm_callable: Callable[[str], str]) -> str:
        # TODO: Implement ReAct reasoning and execution loop
        pass
`,
    referenceSolution: `import re
from typing import Callable, Dict, Any

class ReActAgent:
    def __init__(self, tools: Dict[str, Callable[[str], str]], max_iterations: int = 5):
        self.tools = tools
        self.max_iterations = max_iterations

    def run(self, query: str, llm_callable: Callable[[str], str]) -> str:
        prompt = f"Answer the query: {query}\\nUse format:\\nThought: ...\\nAction: tool_name[tool_input]\\n"

        for step in range(self.max_iterations):
            response = llm_callable(prompt)
            print(f"Step {step + 1}: {response}")

            if "Final Answer:" in response:
                return response.split("Final Answer:")[-1].strip()

            # Parse Action: tool_name[tool_input]
            match = re.search(r"Action:\\s*(\\w+)\\[(.*?)\\]", response)
            if not match:
                # No action found, request clarification
                prompt += f"\\nObservation: Invalid action format. Use Action: tool_name[input]."
                continue

            tool_name, tool_input = match.group(1), match.group(2)
            if tool_name not in self.tools:
                observation = f"Error: Tool '{tool_name}' does not exist. Available: {list(self.tools.keys())}"
            else:
                try:
                    observation = str(self.tools[tool_name](tool_input))
                except Exception as e:
                    observation = f"Execution error: {str(e)}"

            prompt += f"\\nObservation: {observation}\\n"

        return "Error: Maximum iterations exceeded without final answer."
`,
    complexityAnalysis: `Time: O(K * (T_llm + T_tool)) where K is iteration steps.
Space: O(K * Prompt_Length) accumulated in conversation buffer.`,
    keyPitfalls: [
      'Regex failure when tool input contains nested brackets or newlines.',
      'Uncaught tool exceptions crashing the entire runtime rather than returning an error observation.',
      'Infinite execution loops when LLM repeats the same failing action.',
    ],
    interviewExplanation: 'Discuss real production considerations: structured JSON tool calling, timeout handling, and security guards on arbitrary code / database execution.',
  },
];

export const SEED_APPLICATIONS: Omit<Application, 'id' | 'userId'>[] = [
  {
    company: 'ByteDance',
    department: 'Seed / AI Lab',
    position: 'LLM Algorithm Engineer',
    jobType: 'Full-time',
    location: 'Beijing / Singapore',
    jobDescription: 'Lead pretraining and alignment for foundation models, scale RLHF/DPO algorithms, and optimize high-throughput distributed inference pipelines.',
    source: 'Referral',
    resumeVersion: 'v3.2_Algorithm_LLM.pdf',
    applicationDate: '2026-09-05',
    status: 'Interviewing',
    priority: 'High',
    notes: 'Passed Round 1 coding and basic transformer theory. Round 2 deep-dive scheduled on RAG, GQA, and FlashAttention.',
    createdAt: new Date(Date.now() - 86400000 * 16).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    company: 'Anthropic',
    department: 'Claude Core Systems',
    position: 'Alignment & Agent Engineer',
    jobType: 'Full-time',
    location: 'San Francisco, CA (Hybrid)',
    jobDescription: 'Build robust Constitutional AI pipelines, automated red-teaming agents, and long-context retrieval verification.',
    source: 'Company Careers',
    resumeVersion: 'v3.1_Agent_Safety.pdf',
    applicationDate: '2026-09-12',
    status: 'Applied',
    priority: 'High',
    notes: 'Recruiter reached out on LinkedIn, submitted full technical profile.',
    createdAt: new Date(Date.now() - 86400000 * 9).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    company: 'DeepSeek',
    department: 'Infra & Modeling',
    position: 'Inference Optimization Engineer',
    jobType: 'Full-time',
    location: 'Hangzhou / Remote',
    jobDescription: 'Develop custom CUDA kernels for Multi-Head Latent Attention (MLA), optimize FP8 quantization, and reduce speculative decoding latency.',
    source: 'Tech Forum Referral',
    resumeVersion: 'v3.2_Inference_CUDA.pdf',
    applicationDate: '2026-09-15',
    status: 'Assessment',
    priority: 'High',
    notes: 'Coding take-home challenge sent, due in 3 days.',
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    company: 'Microsoft',
    department: 'Copilot Experiences',
    position: 'Senior Applied AI Scientist',
    jobType: 'Full-time',
    location: 'Redmond, WA / Remote',
    jobDescription: 'Design GraphRAG indexing systems, multi-agent orchestration engines, and evaluate retrieval faithfulness across enterprise tenants.',
    source: 'Internal Referral',
    resumeVersion: 'v3.0_Enterprise_RAG.pdf',
    applicationDate: '2026-08-20',
    status: 'Offer',
    priority: 'Medium',
    notes: 'Final offer package received. Decision deadline in 2 weeks.',
    createdAt: new Date(Date.now() - 86400000 * 32).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const SEED_INTERVIEWS: Omit<Interview, 'id' | 'userId'>[] = [
  {
    applicationId: 'seed-app-1',
    companyName: 'ByteDance',
    position: 'LLM Algorithm Engineer',
    roundNumber: 1,
    roundName: 'Technical Screen: Algorithms & Deep Learning',
    scheduledAt: '2026-09-10T14:00:00Z',
    durationMinutes: 60,
    result: 'Passed',
    overallSelfRating: 4,
    retrospective: 'Coding problem was LRU Cache and implement Scaled Dot-Product Attention. Answered the sqrt(d_k) variance proof cleanly. Slight hesitation on GQA vs MQA memory calculation, need to review numbers.',
    rawNotes: 'Interviewer asked about AdamW weight decay vs L2 regularization, why RoPE is better than Sinusoidal for length extrapolation.',
    createdAt: new Date(Date.now() - 86400000 * 11).toISOString(),
  },
  {
    applicationId: 'seed-app-1',
    companyName: 'ByteDance',
    position: 'LLM Algorithm Engineer',
    roundNumber: 2,
    roundName: 'Tech Deep Dive: RAG & Inference',
    scheduledAt: '2026-09-24T15:30:00Z',
    durationMinutes: 60,
    result: 'Scheduled',
    overallSelfRating: undefined,
    retrospective: '',
    rawNotes: 'Focus areas: PagedAttention, KV cache calculation under GQA, hybrid retrieval fusion and BM25 tuning.',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

export const SEED_REVIEW_HISTORY: Omit<ReviewHistory, 'id' | 'userId'>[] = [
  {
    questionId: 'seed-q-1',
    questionTitle: 'Why does scaled dot-product attention divide by sqrt(d_k)?',
    reviewedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    rating: 'Good',
    previousInterval: 3,
    newInterval: 7,
  },
  {
    questionId: 'seed-q-2',
    questionTitle: 'What is the difference between MHA, MQA and GQA?',
    reviewedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    rating: 'Hard',
    previousInterval: 1,
    newInterval: 3,
  },
  {
    questionId: 'seed-q-3',
    questionTitle: 'Why does KV Cache accelerate autoregressive inference?',
    reviewedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    rating: 'Easy',
    previousInterval: 7,
    newInterval: 14,
  },
];
