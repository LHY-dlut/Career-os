# 第7章：AI 编译器

> 来源：[AIInfraGuide](https://github.com/caomaolufei/AIInfraGuide/blob/a3b63eeb81d6d36a3c42c8cfc5a1bdd96e36bab1/docs/guides/%E6%A8%A1%E5%9D%97%E4%BA%8C-CUDA%E7%BC%96%E7%A8%8B%E4%B8%8E%E7%AE%97%E5%AD%90%E4%BC%98%E5%8C%96/%E7%AC%AC7%E7%AB%A0-AI%E7%BC%96%E8%AF%91%E5%99%A8.md) · 作者：草帽路飞（caomaolufei）及 AIInfraGuide contributors · [MIT 许可](/library/licenses/aiinfra-guide-MIT.txt)


## 本章简介

手写 CUDA Kernel 性能极致但开发成本高，AI 编译器通过更高层的抽象在开发效率和性能之间找到平衡。本章覆盖三种主流方案。

**Triton**是目前最受关注的 AI Kernel 编程框架，采用 Block-level 编程模型（对比 CUDA 的 Thread-level），大幅降低了 GPU 编程门槛。本节介绍 Triton 基础语法（tl.load/tl.store/tl.dot/tl.where）并复现官方 Fused Softmax 教程。

**torch.compile**是 PyTorch 2.x 的编译模式，包含 TorchDynamo（Python 字节码级图捕获）和 TorchInductor（后端代码生成）。重点分析 Graph Break 问题（什么情况打断编译、如何避免）和性能收益评估。

**TVM / XLA（概述\）**介绍两者的定位差异：TVM 面向跨硬件编译优化，XLA 面向计算图整体优化，以及它们与 Triton、torch.compile 的关系。
