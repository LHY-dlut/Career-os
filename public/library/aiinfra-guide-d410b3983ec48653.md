# 第4章：经典算子实现—GEMM

> 来源：[AIInfraGuide](https://github.com/caomaolufei/AIInfraGuide/blob/a3b63eeb81d6d36a3c42c8cfc5a1bdd96e36bab1/docs/guides/%E6%A8%A1%E5%9D%97%E4%BA%8C-CUDA%E7%BC%96%E7%A8%8B%E4%B8%8E%E7%AE%97%E5%AD%90%E4%BC%98%E5%8C%96/%E7%AC%AC4%E7%AB%A0-%E7%BB%8F%E5%85%B8%E7%AE%97%E5%AD%90%E5%AE%9E%E7%8E%B0-GEMM.md) · 作者：草帽路飞（caomaolufei）及 AIInfraGuide contributors · [MIT 许可](/library/licenses/aiinfra-guide-MIT.txt)


## 本章简介

GEMM（通用矩阵乘法）是深度学习中最核心的算子——线性层、Attention 的 QKV 投影、FFN 的计算本质上都是 GEMM。本章从零实现高性能 GEMM，理解连接硬件和上层框架的桥梁。

**1. 背景与问题定义** 介绍 GEMM 在深度学习中的地位、问题规模与计算/访存特征，明确优化目标。

**2. 性能分析方法论** 引入算术强度、Roofline 模型与性能评估指标，建立每一步优化的量化分析框架。

**3. 朴素实现：建立 Baseline** 最直观的三重循环 Kernel，暴露全局内存重复访问导致的 Memory-Bound 瓶颈。

**4. Thread Block 级 Tiling 优化** 将矩阵切成 Tile 载入共享内存，从数学上分析全局内存访问的减少量，完成第一轮数据复用。

**5. Thread 级 Tiling 优化** 在寄存器中缓存子块结果，每个线程计算多个输出元素，进一步提升计算密度与数据复用率。

**6. Warp 级分块优化** 按 Warp 组织 Tile 结构，配合线程映射对齐硬件执行单元，减少 Warp 内冗余计算与同步开销。

**7. 向量化访存：float4 优化** 使用 `float4` 合并加载/存储，减少访存指令数并提升有效带宽利用率。

**8. Bank Conflict 消除** 通过 Padding 或地址重排打破 Shared Memory 访问的 Bank 冲突，让共享内存吞吐回归峰值。

**9. 双缓冲与流水线** 在共享内存中开两份 Buffer，让数据加载与计算重叠，隐藏全局内存延迟。

**10. Ampere 异步拷贝流水线** 利用 `cp.async` 将全局内存到共享内存的拷贝异步化，构建多级软件流水线，进一步压榨延迟。

**11. SASS 级优化与寄存器调度** 深入指令级调优：寄存器分配、指令排布与 Bank Conflict，对照 cuBLAS 的 SASS 代码理解极致性能从何而来。

**12. 实战参数选择与调优指南** 总结 Tile 尺寸、线程布局、Block 数量等参数的选择方法论，给出不同矩阵规模与硬件下的调优思路。
