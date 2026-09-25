# 第5章：经典算子实现—Softmax 与算子融合

> 来源：[AIInfraGuide](https://github.com/caomaolufei/AIInfraGuide/blob/a3b63eeb81d6d36a3c42c8cfc5a1bdd96e36bab1/docs/guides/%E6%A8%A1%E5%9D%97%E4%BA%8C-CUDA%E7%BC%96%E7%A8%8B%E4%B8%8E%E7%AE%97%E5%AD%90%E4%BC%98%E5%8C%96/%E7%AC%AC5%E7%AB%A0-%E7%BB%8F%E5%85%B8%E7%AE%97%E5%AD%90%E5%AE%9E%E7%8E%B0-Softmax%E4%B8%8E%E7%AE%97%E5%AD%90%E8%9E%8D%E5%90%88.md) · 作者：草帽路飞（caomaolufei）及 AIInfraGuide contributors · [MIT 许可](/library/licenses/aiinfra-guide-MIT.txt)


## 本章简介

Softmax 是 Transformer 中最关键的非线性操作之一，也是理解 FlashAttention 的前置知识。本章从数值稳定性问题出发，逐步优化到 Online Softmax，并引入算子融合的思想。

**Softmax 的数值稳定实现**分析朴素实现的数值溢出问题，引入 Safe Softmax（减最大值技巧），并分析三遍扫描（max → exp-sum → normalize）的性能开销。

**Online Softmax**讲解 Online normalizer calculation 原理，推导一遍扫描完成 Softmax 的算法，并在 GPU 上高效实现——这是 FlashAttention 的核心前置知识。

**算子融合**解释为什么需要融合（减少 Kernel Launch 和全局内存读写），介绍常见融合模式（Bias + Activation、LayerNorm + Dropout）以及手动融合与编译器自动融合的对比。

**动手实验**：实现 Online Softmax CUDA Kernel，将 Softmax + Scale 融合为一个 Kernel 并对比性能。
