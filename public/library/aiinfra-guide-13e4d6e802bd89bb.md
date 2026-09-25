# 第3章：经典算子实现—Reduce

> 来源：[AIInfraGuide](https://github.com/caomaolufei/AIInfraGuide/blob/a3b63eeb81d6d36a3c42c8cfc5a1bdd96e36bab1/docs/guides/%E6%A8%A1%E5%9D%97%E4%BA%8C-CUDA%E7%BC%96%E7%A8%8B%E4%B8%8E%E7%AE%97%E5%AD%90%E4%BC%98%E5%8C%96/%E7%AC%AC3%E7%AB%A0-%E7%BB%8F%E5%85%B8%E7%AE%97%E5%AD%90%E5%AE%9E%E7%8E%B0-Reduce.md) · 作者：草帽路飞（caomaolufei）及 AIInfraGuide contributors · [MIT 许可](/library/licenses/aiinfra-guide-MIT.txt)


## 本章简介

Reduce（归约）是最经典的并行算法之一，也是学习 CUDA 优化的最佳入门案例。本章通过三个递进版本，体验"分析瓶颈 → 针对优化 → 量化收益"的完整优化循环。

**朴素实现**使用全局内存 + 原子加，最简单但最慢，通过性能分析定位瓶颈。

**共享内存 + 树形归约**在 Block 内使用共享内存进行树形归约，消除 Warp Divergence，处理多 Block 的二次归约问题。

**Warp Shuffle 优化**用 `__shfl_down_sync` 替代共享内存，完全消除 Bank Conflict，实现 Warp 级的高效 Reduce。

**多级归约与大规模数据**介绍 Grid-stride loop 处理超大数组的技巧。

**动手实验**：实现三个版本的 Reduce Sum，使用 Nsight Compute 对比 throughput，说清每一步优化到底省在哪里。
