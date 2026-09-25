# 第7章：Prefill/Decode 解耦架构

> 来源：[AIInfraGuide](https://github.com/caomaolufei/AIInfraGuide/blob/a3b63eeb81d6d36a3c42c8cfc5a1bdd96e36bab1/docs/guides/%E6%A8%A1%E5%9D%97%E5%9B%9B-%E6%8E%A8%E7%90%86%E4%BC%98%E5%8C%96/%E7%AC%AC7%E7%AB%A0-PD%E8%A7%A3%E8%80%A6%E6%9E%B6%E6%9E%84.md) · 作者：草帽路飞（caomaolufei）及 AIInfraGuide contributors · [MIT 许可](/library/licenses/aiinfra-guide-MIT.txt)


## 本章简介

Prefill 和 Decode 的计算特性截然不同（Compute Bound vs Memory Bound），混在一起会互相干扰。本章深入解耦架构的设计与挑战，并落到 vLLM 的 Disaggregated Prefill 能力。

**混合 Batching 的问题**定量分析 Prefill 对 Decode 的干扰：Decode P95 TPOT 可被拖慢 3-5 倍。

**解耦架构设计**覆盖 DistServe（OSDI'24，系统化论证 P/D 解耦）、Splitwise（ISCA'24，分配到不同 GPU 池）、TaiChi（聚合与解耦统一框架）和 MLC Microserving（跨引擎编排）。

**KV Cache 传输与 Connector**深入解耦架构最核心的工程挑战：Prefill 节点算出的 KV Cache 如何高效搬到 Decode 节点。介绍 vLLM 的 KV Connector 抽象、NIXL/NCCL 等传输后端，以及跨节点带宽对整体延迟的影响。

**Goodput 与 SLO 感知调度**强调 Raw QPS 不等于用户体验，Goodput（满足 SLO 的有效吞吐）才是真正的优化目标。

**解耦架构的挑战**包括调度器复杂度、P/D GPU 池的资源配比推导，以及何时该用/不该用解耦。

**vLLM Disaggregated Prefill 实战**：用 vLLM 的解耦部署构造混合负载，量化 P/D 互扰程度并推导给定工作负载下的 P/D GPU 池配比。

## 本章小节

- **7.1 混合 Batching 的问题**：Prefill 对 Decode 的定量干扰分析
- **7.2 解耦架构设计**：DistServe、Splitwise、TaiChi、Microserving
- **7.3 KV Cache 传输与 Connector**：KV Connector、NIXL/NCCL、带宽压力
- **7.4 Goodput 与 SLO 感知调度**：以有效吞吐为优化目标
- **7.5 解耦架构的挑战与配比**：调度复杂度、P/D GPU 池配比
- **7.6 vLLM Disaggregated Prefill 实战**：解耦部署与互扰量化
