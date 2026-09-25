# 第8章：性能分析工具链

> 来源：[AIInfraGuide](https://github.com/caomaolufei/AIInfraGuide/blob/a3b63eeb81d6d36a3c42c8cfc5a1bdd96e36bab1/docs/guides/%E6%A8%A1%E5%9D%97%E4%BA%8C-CUDA%E7%BC%96%E7%A8%8B%E4%B8%8E%E7%AE%97%E5%AD%90%E4%BC%98%E5%8C%96/%E7%AC%AC8%E7%AB%A0-%E6%80%A7%E8%83%BD%E5%88%86%E6%9E%90%E5%B7%A5%E5%85%B7%E9%93%BE.md) · 作者：草帽路飞（caomaolufei）及 AIInfraGuide contributors · [MIT 许可](/library/licenses/aiinfra-guide-MIT.txt)


## 本章简介

优化的前提是精准诊断——不会用 Profiler 的优化都是盲猜。本章掌握 AI Infra 领域三大核心性能分析工具。

**Nsight Systems**是 CPU-GPU 全链路分析利器，用于识别 GPU idle gap 的来源（CPU 瓶颈、通信等待、Kernel Launch Overhead），抓取训练 iteration 的 trace 并进行宏观分析。

**Nsight Compute**是 Kernel 级下钻分析工具，重点掌握 SOL（Speed of Light）面板解读——判断 Kernel 是 Memory Bound 还是 Compute Bound，以及 Shared Memory、Warp State 等面板的使用和两个 Kernel 版本的对比分析。

**PyTorch Profiler**通过 `torch.profiler` 与 TensorBoard 集成，识别耗时最长的算子，评估 torch.compile 的编译收益。

**动手实验**：用 Nsight Systems 抓一次训练 iteration 指出 GPU idle gap 来源，用 Nsight Compute 对比 Reduce 三版本的性能报告。
