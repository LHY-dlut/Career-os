# 第3章：优化器

> 来源：[AIInfraGuide](https://github.com/caomaolufei/AIInfraGuide/blob/a3b63eeb81d6d36a3c42c8cfc5a1bdd96e36bab1/docs/guides/%E6%A8%A1%E5%9D%97%E4%B8%89-%E5%88%86%E5%B8%83%E5%BC%8F%E8%AE%AD%E7%BB%83/%E7%AC%AC3%E7%AB%A0-%E4%BC%98%E5%8C%96%E5%99%A8.md) · 作者：草帽路飞（caomaolufei）及 AIInfraGuide contributors · [MIT 许可](/library/licenses/aiinfra-guide-MIT.txt)


## 📖 本章概述

优化器是训练的"舵手"——梯度算出来只解决了"往哪走"，"怎么走、走多远"全靠它。本章不纠缠数学推导，只聚焦 AI Infra 工程师最该关心的两件事：**优化器内部存了什么**（直接决定显存占用）、**分布式场景下它有什么特殊要求**（大 Batch 收敛）。这两点是理解后续 ZeRO 显存优化与混合精度训练的直接前提。

---

## 📑 章节结构

### 3.1 优化器原理与显存开销分析

单篇讲透本章全部内容，主线如下：

- **优化器在训练循环中的位置**：`optimizer.step()` 背后的三步，以及"内部状态持久驻留显存"这一显存开销的根源
- **演进主线（SGD → Momentum → Adam → AdamW）**：每一步多存了几份状态、解决了什么问题，AdamW 为何成为大模型训练标准
- **显存开销分析（重点）**：每参数字节数对照、AdamW + 混合精度下 7B 模型的完整显存账本、优化器状态占约 75\% 的推导，以及为什么必须用 FP32 主权重
- **大 Batch 优化器**：数据并行放大 Batch 带来的收敛困境，LARS/LAMB 的逐层自适应缩放思想与适用场景
- **动手实验**：用 PyTorch 统计优化器 `state` 元素数，实测验证"Adam 每参数存 2 份、SGD 存 0 份"

---

---

## 🎯 本章学习目标

- 能说清 SGD → Momentum → Adam → AdamW 每一步演进解决了什么问题、多存了什么状态
- 能手算任意规模模型在 AdamW + 混合精度下的优化器状态显存，并解释它为什么约占静态显存的 75\%
- 能解释混合精度训练中优化器为什么必须用 FP32 主权重
- 能回答"Batch Size 放大 10 倍，学习率怎么调"，知道 LAMB/LARS 在什么场景下才有必要
