# 第2章：集合通信原语

> 来源：[AIInfraGuide](https://github.com/caomaolufei/AIInfraGuide/blob/a3b63eeb81d6d36a3c42c8cfc5a1bdd96e36bab1/docs/guides/%E6%A8%A1%E5%9D%97%E4%B8%89-%E5%88%86%E5%B8%83%E5%BC%8F%E8%AE%AD%E7%BB%83/%E7%AC%AC2%E7%AB%A0-%E9%9B%86%E5%90%88%E9%80%9A%E4%BF%A1%E5%8E%9F%E8%AF%AD.md) · 作者：草帽路飞（caomaolufei）及 AIInfraGuide contributors · [MIT 许可](/library/licenses/aiinfra-guide-MIT.txt)


## 📖 本章概述

所有并行策略最终都落到一件事上：**多张卡之间如何高效交换数据**。AllReduce、ReduceScatter、AllGather 这些名词会在后续每一章反复出现——DDP 靠 AllReduce 同步梯度、ZeRO-2 用 ReduceScatter、TP 用 AllReduce、MoE 用 All-to-All。本章把这套"通信字母表"一次讲清，并给出通信量的量化方法，这样后续分析任何策略的通信代价时都能自己算出来。

> 本章是理解后续所有并行策略通信代价的前置知识。建议读完能默写出每个原语的"输入 → 输出"语义图。

---

## 📑 章节结构

### 1. 为什么要单独讲通信原语

- 并行策略的本质 = 切分 + 通信，切分决定显存、通信决定速度
- 一张"通信操作 vs 并行策略"的对照表（先给全景，后续逐个展开）
- 通信发生在哪：NVLink（机内）vs InfiniBand/RoCE（机间）vs PCIe，带宽差一个数量级

### 2. 点对点通信（Point-to-Point）

- `send` / `recv`：最基础的两进程通信，PP 的 Stage 间传激活值就靠它
- 同步 vs 异步（`isend` / `irecv`）与死锁风险

### 3. 集合通信原语详解

逐个给出"输入 → 输出"语义图 + 典型用途：

- **Broadcast**：一个 rank 的数据复制到所有 rank（如初始化时同步参数）
- **Scatter / Gather**：分发 / 收集（DP 老方案、数据切分）
- **Reduce**：所有 rank 的数据规约（求和/求最大）到一个 rank
- **AllReduce**：规约结果广播到所有 rank（DDP 梯度同步、TP 输出合并）—— 本章重点
- **ReduceScatter**：规约后每个 rank 只拿自己负责的分片（ZeRO-2/3、FSDP 反向）
- **AllGather**：每个 rank 的分片拼成完整数据广播给所有 rank（ZeRO-3 前向、FSDP 重组参数）
- **All-to-All**：每个 rank 给每个 rank 发不同数据（MoE Expert Parallel、Ulysses 序列并行）
- **关键恒等式**：`AllReduce = ReduceScatter + AllGather`（贯穿 ZeRO/SP 的核心）

### 4. Ring AllReduce 算法原理（本章重点）

- 朴素 AllReduce 的问题：中心节点带宽瓶颈
- Ring 算法两阶段：Reduce-Scatter 阶段 + AllGather 阶段
- **通信量推导**：每卡收发 $2\frac{N-1}{N}\Psi \approx 2\Psi$（与卡数无关，这就是 Ring 的精髓）
- 带宽最优性：为什么 Ring 在大数据量下接近带宽上限
- 其他拓扑简介：Tree AllReduce（小数据低延迟）、Double Binary Tree、NCCL 的自动选择

### 5. 通信量的量化方法

- 统一记号：参数量 $\Psi$、batch $b$、序列 $s$、隐藏维 $h$
- 三类通信量公式：AllReduce $2\Psi$、ReduceScatter / AllGather 各 $\Psi$、All-to-All
- 通信时间估算：$T \approx \alpha + \frac{\text{数据量}}{\text{带宽}}$（延迟项 $\alpha$ + 带宽项）
- 计算/通信重叠（overlap）的基本原理：为什么能"算的同时传"

### 6. 动手实验

- 用 `torch.distributed` 跑通 7 个集合通信原语，打印各 rank 的输入输出验证语义
- 用 `NCCL_DEBUG=INFO` 观察 NCCL 选择了哪种算法
- 测量不同数据量下 AllReduce 的实测带宽，对比 NVLink 与 PCIe

---

## 🎯 本章学习目标

- 能画出 7 个集合通信原语的"输入 → 输出"语义图
- 能推导 Ring AllReduce 每卡通信量为 $2\Psi$ 且与卡数无关
- 能默写恒等式 $\text{AllReduce} = \text{ReduceScatter} + \text{AllGather}$ 并解释它在 ZeRO 中的意义
- 能用 $T \approx \alpha + \text{数据量}/\text{带宽}$ 估算一次通信的耗时
