# 第4章：量化

> 来源：[AIInfraGuide](https://github.com/caomaolufei/AIInfraGuide/blob/a3b63eeb81d6d36a3c42c8cfc5a1bdd96e36bab1/docs/guides/%E6%A8%A1%E5%9D%97%E5%9B%9B-%E6%8E%A8%E7%90%86%E4%BC%98%E5%8C%96/%E7%AC%AC4%E7%AB%A0-%E9%87%8F%E5%8C%96.md) · 作者：草帽路飞（caomaolufei）及 AIInfraGuide contributors · [MIT 许可](/library/licenses/aiinfra-guide-MIT.txt)


## 本章简介

量化是推理优化中"用精度换性能"的核心技术，本章系统覆盖从基础概念到工程选型的完整链路，并落到 vLLM 的量化生态。

**量化基础**介绍对称/非对称量化、Per-tensor/Per-channel/Per-group 量化粒度，以及 PTQ（训练后量化）vs QAT（量化感知训练）的对比。

**W8A8 量化（SmoothQuant）**解决 Activation Outlier 导致直接量化效果差的问题，通过数学等价变换将量化难度从 Activation 转移到 Weight。

**Weight-only INT4 量化**对比 GPTQ（基于 Hessian 信息逐层量化）和 AWQ（基于 Activation 分布保护重要权重）的精度与速度，以及 Marlin Kernel 的高性能实现。

**KV Cache 量化**（KIVI 2-bit / FP8 KV Cache）针对长上下文显存瓶颈；**FP8 与 NVFP4/MXFP4 低比特浮点量化**分别对应 Hopper（原生 E4M3/E5M2）和 Blackwell（NVFP4/MXFP4）新一代硬件的原生加速。

**量化选型决策树**：精度优先 → W8A8，省显存 → INT4，长上下文 → KV Cache 量化，Hopper → FP8，Blackwell → NVFP4。

**在 vLLM 中启用量化实战**：介绍 vLLM 对 compressed-tensors、GPTQ、AWQ、FP8、NVFP4 等格式的开箱即用支持，并用 vLLM 对比 FP16 与 AWQ-INT4 的 Throughput 与生成质量。

## 本章小节

- **4.1 量化基础**：对称/非对称、量化粒度、PTQ vs QAT
- **4.2 W8A8 量化（SmoothQuant）**：Activation Outlier 与等价变换
- **4.3 Weight-only INT4**：GPTQ、AWQ、Marlin Kernel
- **4.4 KV Cache 量化**：KIVI 2-bit、FP8 KV Cache
- **4.5 FP8 与 NVFP4/MXFP4**：Hopper 与 Blackwell 的低比特浮点
- **4.6 量化选型与 vLLM 实战**：决策树 + vLLM 启用量化
