# 第1章：LLM 推理基础

> 来源：[AIInfraGuide](https://github.com/caomaolufei/AIInfraGuide/blob/a3b63eeb81d6d36a3c42c8cfc5a1bdd96e36bab1/docs/guides/%E6%A8%A1%E5%9D%97%E5%9B%9B-%E6%8E%A8%E7%90%86%E4%BC%98%E5%8C%96/%E7%AC%AC1%E7%AB%A0-LLM%E6%8E%A8%E7%90%86%E5%9F%BA%E7%A1%80/%E7%AC%AC1%E7%AB%A0-LLM%E6%8E%A8%E7%90%86%E5%9F%BA%E7%A1%80.md) · 作者：草帽路飞（caomaolufei）及 AIInfraGuide contributors · [MIT 许可](/library/licenses/aiinfra-guide-MIT.txt)


## 本章简介

推理是大模型从训练走向落地的关键环节。本章建立推理优化的基础概念和分析框架，后续所有优化技术（以 vLLM 为主线）都建立在这套框架之上。

**自回归生成过程**详解 LLM 推理的两阶段：Prefill（一次性处理完整 Prompt，Compute Bound）和 Decode（逐 Token 生成，Memory Bound），以及为什么 Decode 阶段效率远低于 Prefill。

**KV Cache**是推理优化的核心概念：缓存已计算的 Key 和 Value 避免重复计算，包括 KV Cache 的生命周期（分配 → 填充 → 使用 → 释放）、显存计算公式和碎片化问题。

**关键性能指标**覆盖 TTFT（首 Token 延迟）、TPOT/ITL（每 Token 延迟）、Throughput（吞吐量）、P50/P95/P99 尾延迟和 Goodput（满足 SLO 的有效吞吐）。

**瓶颈分析方法**引入算术强度（Arithmetic Intensity）与 Roofline 模型，从第一性原理解释为什么 Decode 阶段是 Memory Bound、打不满 GPU 算力，为后续所有优化技术提供统一的分析视角。

**推理链路拆解**走通 Tokenize → Prefill → Decode Loop → Sampling → Detokenize 的完整流程，分析每个环节的计算特性与潜在瓶颈，并对照 vLLM 的实际执行路径。

## 本章小节

- **1.1 自回归生成过程**：Prefill / Decode 两阶段的计算特性对比
- **1.2 KV Cache 机制**：生命周期、显存计算公式、碎片化问题
- **1.3 关键性能指标**：TTFT、TPOT/ITL、Throughput、尾延迟、Goodput
- **1.4 瓶颈分析方法**：算术强度、Roofline 模型、Memory Bound 本质
- **1.5 推理链路拆解**：从 Tokenize 到 Detokenize 的全流程与瓶颈定位
