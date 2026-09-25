# 第2章：推理引擎核心技术

> 来源：[AIInfraGuide](https://github.com/caomaolufei/AIInfraGuide/blob/a3b63eeb81d6d36a3c42c8cfc5a1bdd96e36bab1/docs/guides/%E6%A8%A1%E5%9D%97%E5%9B%9B-%E6%8E%A8%E7%90%86%E4%BC%98%E5%8C%96/%E7%AC%AC2%E7%AB%A0-%E6%8E%A8%E7%90%86%E5%BC%95%E6%93%8E%E6%A0%B8%E5%BF%83%E6%8A%80%E6%9C%AF/%E7%AC%AC2%E7%AB%A0-%E6%8E%A8%E7%90%86%E5%BC%95%E6%93%8E%E6%A0%B8%E5%BF%83%E6%8A%80%E6%9C%AF.md) · 作者：草帽路飞（caomaolufei）及 AIInfraGuide contributors · [MIT 许可](/library/licenses/aiinfra-guide-MIT.txt)


## 本章简介

现代 LLM 推理引擎的高性能来自多项核心技术的协同，本章逐一深入，并对照 vLLM 的具体实现。

**PagedAttention**借鉴操作系统虚拟内存分页的思想，通过虚拟页/物理页映射解决 KV Cache 碎片化问题，大幅提升内存利用率。

**Continuous Batching**解决 Static Batching 中短请求被长请求拖累的问题：请求随到随拼、完成随时退出，实现 Iteration-level Scheduling，将 GPU 利用率从约 30% 提升到 80%+。

**Prefix Cache / RadixAttention**针对大量请求共享相同 System Prompt 的场景：vLLM 的 Prefix Cache 通过 Hash 匹配复用已有 KV 块，SGLang 的 RadixAttention 基于 Radix Tree 实现更高效的前缀共享。vLLM V1 引擎已将 Prefix Cache 做到「零命中开销」并默认开启。

**Chunked Prefill 与统一 Token Budget 调度**将长 Prompt 拆成多个 Chunk 分块处理，减少 Prefill 对 Decode 请求的干扰。vLLM V1 更进一步取消 Prefill/Decode 的二分，用统一的 Token 预算调度器同时容纳两类请求。

**Attention 后端与图优化**介绍 vLLM 可插拔的 Attention 后端（FlashAttention 3 / FlashInfer / FlashMLA / Triton）如何支持 Prefill/Decode 混合批次，以及 CUDA Graph 与 torch.compile 如何消除逐 Kernel 启动开销、降低 Decode 阶段的 CPU 瓶颈。

## 本章小节

- **2.1 PagedAttention**：KV Cache 分页管理，解决碎片化
- **2.2 Continuous Batching**：Iteration-level Scheduling 提升 GPU 利用率
- **2.3 Prefix Cache**：vLLM Hash-based APC vs SGLang RadixAttention
- **2.4 Chunked Prefill 与统一 Token Budget 调度**：减少 Prefill 对 Decode 的干扰
- **2.5 Attention 后端与图优化**：FlashAttention 3 / FlashInfer / FlashMLA、CUDA Graph、torch.compile
