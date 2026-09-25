# 第6章：集合通信基础

> 来源：[AIInfraGuide](https://github.com/caomaolufei/AIInfraGuide/blob/a3b63eeb81d6d36a3c42c8cfc5a1bdd96e36bab1/docs/guides/%E6%A8%A1%E5%9D%97%E4%B8%80-%E5%89%8D%E7%BD%AE%E7%9F%A5%E8%AF%86/%E7%AC%AC6%E7%AB%A0-%E9%9B%86%E5%90%88%E9%80%9A%E4%BF%A1%E5%9F%BA%E7%A1%80.md) · 作者：草帽路飞（caomaolufei）及 AIInfraGuide contributors · [MIT 许可](/library/licenses/aiinfra-guide-MIT.txt)


## 本章简介

集合通信是分布式训练的"血管系统"，理解通信原语和算法是设计并行策略的前提。

**通信原语**部分覆盖点对点通信（Send/Recv）和集合通信（Broadcast、Reduce、AllReduce、AllGather、ReduceScatter），配合数据流示意图和通信量公式，建立直觉。

**通信算法**部分重点讲解 Ring AllReduce 的原理与通信量分析（2(N-1)/N × 数据量）、Tree AllReduce，以及通信与计算 overlap 的核心思想。

**NCCL**部分介绍 NVIDIA 官方集合通信库的定位、基本用法、环境变量调优，以及使用 nccl-tests 进行通信性能测试。
