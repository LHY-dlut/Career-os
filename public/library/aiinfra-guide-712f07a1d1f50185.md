# 第3章：深入 vLLM 架构与源码

> 来源：[AIInfraGuide](https://github.com/caomaolufei/AIInfraGuide/blob/a3b63eeb81d6d36a3c42c8cfc5a1bdd96e36bab1/docs/guides/%E6%A8%A1%E5%9D%97%E5%9B%9B-%E6%8E%A8%E7%90%86%E4%BC%98%E5%8C%96/%E7%AC%AC3%E7%AB%A0-%E6%B7%B1%E5%85%A5vLLM/%E7%AC%AC3%E7%AB%A0-%E6%B7%B1%E5%85%A5vLLM.md) · 作者：草帽路飞（caomaolufei）及 AIInfraGuide contributors · [MIT 许可](/library/licenses/aiinfra-guide-MIT.txt)


## 本章简介

vLLM 是本模块的实例主线。前两章讲的核心技术，本章落到 vLLM 的真实代码里看它们如何被组织、调度和调优；同时横向对比 SGLang 与 TensorRT-LLM，帮助你做框架选型。

**快速入门**从安装、离线批量推理到 OpenAI 兼容服务部署，用最短路径跑通第一个 vLLM 推理服务。

**整体架构**拆解 vLLM 的分层设计：`LLMEngine` / `AsyncLLM` 入口、`EngineCore` 执行循环、`Scheduler` 调度器、`KVCacheManager` 显存管理、`Worker` / `ModelRunner` 模型执行，理清一个请求从进入到返回的完整数据流。

**V1 引擎**是 vLLM 近年最重要的重构：多进程隔离让 Tokenize/Detokenize 等 CPU 任务与核心循环重叠、统一 Token 预算调度器抹平 Prefill/Decode 边界、零开销 Prefix Cache 默认开启、Persistent Batch 只传增量 diff，整体吞吐相比 V0 提升约 1.7 倍。

**调度器源码导读**深入 Waiting/Running 队列、Token Budget 分配、抢占（Preemption）与重计算（Recompute）机制，看懂 vLLM 每一步 step 到底做了什么。

**关键配置调优**讲清 `gpu-memory-utilization`、`max-num-seqs`、`max-num-batched-tokens`、`block-size` 等参数如何影响吞吐、延迟和显存，给出调参决策思路。

**框架横向对比**用统一维度对照 vLLM（通用、生态最全）、SGLang（RadixAttention、结构化输出、Agent 场景）、TensorRT-LLM（NVIDIA 深度优化、极限延迟），给出选型决策表。

## 本章小节

- **3.1 vLLM 快速入门**：安装、离线批量推理、OpenAI 兼容服务部署
- **3.2 vLLM 整体架构**：LLMEngine/AsyncLLM、EngineCore、Scheduler、KVCacheManager、Worker/ModelRunner
- **3.3 V1 引擎深度解析**：多进程架构、统一调度、零开销 Prefix Cache、相比 V0 的改进
- **3.4 调度器源码导读**：Token Budget、Waiting/Running 队列、抢占与重计算
- **3.5 关键配置调优**：显存、批大小、Block 等核心参数的调参思路
- **3.6 框架横向对比**：vLLM / SGLang / TensorRT-LLM 选型决策
