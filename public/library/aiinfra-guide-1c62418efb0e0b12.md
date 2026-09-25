# 第6章：Attention 算子

> 来源：[AIInfraGuide](https://github.com/caomaolufei/AIInfraGuide/blob/a3b63eeb81d6d36a3c42c8cfc5a1bdd96e36bab1/docs/guides/%E6%A8%A1%E5%9D%97%E4%BA%8C-CUDA%E7%BC%96%E7%A8%8B%E4%B8%8E%E7%AE%97%E5%AD%90%E4%BC%98%E5%8C%96/%E7%AC%AC6%E7%AB%A0-Attention%E7%AE%97%E5%AD%90.md) · 作者：草帽路飞（caomaolufei）及 AIInfraGuide contributors · [MIT 许可](/library/licenses/aiinfra-guide-MIT.txt)


## 本章简介

Attention 是 Transformer 的核心计算，也是 AI Infra 优化的重中之重。本章从标准 Attention 的性能问题出发，深入 FlashAttention 系列和 Decode 阶段加速技术。

**标准 Attention 的性能问题**分析朴素实现的 O(N²) 显存占用和计算/显存瓶颈。

**FlashAttention V1**详解核心思想：Tiling + Online Softmax 避免物化 N×N 矩阵，将 HBM 读写从 O(N²) 降到 O(N)，以及反向传播中的重计算策略。

**FlashAttention V2** 改进的并行策略（沿 Q 序列维度并行）和 Causal Mask 优化。

**FlashAttention-3** 利用 Hopper 架构特性（WGMMA、TMA、FP8）的异步流水线优化。

**Decode 阶段加速**覆盖 Flash-Decoding、FlashDecoding++、FlashInfer 等面向 Serving 的 Attention 引擎。

**PagedAttention CUDA 实现**解读 vLLM 中虚拟页到物理页映射在 GPU 上的实现。

**动手实验**：白板推导 FlashAttention Tiling 过程，用 Triton 实现简化版 FlashAttention。
