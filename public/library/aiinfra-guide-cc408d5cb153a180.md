# 第3章：AI Infra工程师学Transformer

> 来源：[AIInfraGuide](https://github.com/caomaolufei/AIInfraGuide/blob/a3b63eeb81d6d36a3c42c8cfc5a1bdd96e36bab1/docs/guides/%E6%A8%A1%E5%9D%97%E4%B8%80-%E5%89%8D%E7%BD%AE%E7%9F%A5%E8%AF%86/%E7%AC%AC3%E7%AB%A0-Transformer%E6%9E%B6%E6%9E%84%E8%AF%A6%E8%A7%A3.md) · 作者：草帽路飞（caomaolufei）及 AIInfraGuide contributors · [MIT 许可](/library/licenses/aiinfra-guide-MIT.txt)


## 本章简介

Transformer 是大模型时代的核心架构，也是 AI Infra 工程师必须深入理解的对象——你优化的每一个算子、设计的每一种并行策略，最终都作用在 Transformer 的某个组件上。

本章从 **Self-Attention 机制**出发，详解 Q/K/V 投影、Attention 计算全流程及其 O(N²) 复杂度分析。接着覆盖 **FFN 与激活函数**（ReLU/GELU/SwiGLU）、**位置编码**（Sinusoidal/RoPE/ALiBi）、**归一化层**（LayerNorm/RMSNorm、Pre-Norm vs Post-Norm）。

**完整前向过程**部分将逐步追踪从 Token Embedding 到输出 Logits 的完整数据流，标注每一步的输入输出维度，并手算参数量。

最后从分布式与推理视角分析 **架构变种**：MHA → MQA → GQA → MLA 的演进动机，以及 FFN → GLU → MoE 的变化如何影响并行切分和推理优化。
