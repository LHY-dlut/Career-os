# 第11章：推理优化选型与端到端实战

> 来源：[AIInfraGuide](https://github.com/caomaolufei/AIInfraGuide/blob/a3b63eeb81d6d36a3c42c8cfc5a1bdd96e36bab1/docs/guides/%E6%A8%A1%E5%9D%97%E5%9B%9B-%E6%8E%A8%E7%90%86%E4%BC%98%E5%8C%96/%E7%AC%AC11%E7%AB%A0-%E6%8E%A8%E7%90%86%E4%BC%98%E5%8C%96%E9%80%89%E5%9E%8B%E4%B8%8E%E7%AB%AF%E5%88%B0%E7%AB%AF%E5%AE%9E%E6%88%98.md) · 作者：草帽路飞（caomaolufei）及 AIInfraGuide contributors · [MIT 许可](/library/licenses/aiinfra-guide-MIT.txt)


## 本章简介

本章是推理优化模块的总结和实战落地，也是整个课程的收官。把前面各章的技术串成一条可执行的决策与部署链路，以 vLLM 端到端上线为最终实战。

**优化选型决策树**根据症状选择技术：TTFT 过高 → Chunked Prefill / Prefix Cache / GEMM 优化；TPOT 过高 → FlashAttention / Speculative Decoding；显存不够 → PagedAttention / 量化 / 并行；尾延迟失控 → P/D 解耦 / SLO 感知调度。

**优化组合注意事项**强调技术叠加不等于效果叠加，分析常见冲突（Speculative Decoding + 量化、Speculative Decoding + Continuous Batching），建议优化顺序：OOM → TTFT → TPOT/Throughput → 尾延迟。

**端到端部署实战**走通完整流程：需求分析（模型规格、SLO 要求、硬件资源）→ 方案设计（框架、量化、并行方案）→ 部署（模型转换、配置调优、压测验证）→ 上线监控（指标采集、告警、容量规划），全程用 vLLM 落地。

**课程总结**回顾四大模块的知识关联图、核心 trade-off 汇总表，以及持续学习建议：跟踪前沿论文、参与开源社区、积累工程经验。

## 本章小节

- **11.1 优化选型决策树**：按症状（TTFT/TPOT/显存/尾延迟）选择技术
- **11.2 优化组合注意事项**：技术叠加的冲突与推荐优化顺序
- **11.3 端到端部署实战**：需求分析 → 方案设计 → 部署压测 → 上线监控
- **11.4 模块总结与持续学习**：知识关联图、trade-off 汇总、学习建议
