# 第5章：GPU 硬件概论

> 来源：[AIInfraGuide](https://github.com/caomaolufei/AIInfraGuide/blob/a3b63eeb81d6d36a3c42c8cfc5a1bdd96e36bab1/docs/guides/%E6%A8%A1%E5%9D%97%E4%B8%80-%E5%89%8D%E7%BD%AE%E7%9F%A5%E8%AF%86/%E7%AC%AC5%E7%AB%A0-GPU%E7%A1%AC%E4%BB%B6%E6%A6%82%E8%AE%BA.md) · 作者：草帽路飞（caomaolufei）及 AIInfraGuide contributors · [MIT 许可](/library/licenses/aiinfra-guide-MIT.txt)


## 本章简介

在动手写 CUDA 代码之前，必须先搞清楚"工厂怎么布局"——GPU 的硬件架构直接决定了你写出的代码能跑多快。

**GPU 架构总览**对比 CPU vs GPU 的设计哲学差异（延迟优化 vs 吞吐优化），介绍 SM、CUDA Core、Tensor Core 的层次结构，以及 Warp（32 线程最小调度单位）的概念。

**GPU 存储层次**详解从寄存器到 HBM 再到主机内存的完整存储层次，包括各级存储的容量、带宽、延迟量级，以及 Memory Wall 问题——为什么显存带宽往往比算力先成为瓶颈。

**主流 GPU 规格对比**列出 A100/H100/H200/B200 的关键参数，引入 Arithmetic Intensity 和 Roofline Model 的概念。

**互联拓扑**介绍单机 NVLink/NVSwitch 和多机 InfiniBand 网络，解读 `nvidia-smi topo -m` 输出，理解为什么互联带宽直接决定并行策略的选择。
