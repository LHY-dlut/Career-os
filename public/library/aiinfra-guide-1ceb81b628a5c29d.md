# 第4章：PyTorch 框架

> 来源：[AIInfraGuide](https://github.com/caomaolufei/AIInfraGuide/blob/a3b63eeb81d6d36a3c42c8cfc5a1bdd96e36bab1/docs/guides/%E6%A8%A1%E5%9D%97%E4%B8%80-%E5%89%8D%E7%BD%AE%E7%9F%A5%E8%AF%86/%E7%AC%AC4%E7%AB%A0-PyTorch%E6%A1%86%E6%9E%B6.md) · 作者：草帽路飞（caomaolufei）及 AIInfraGuide contributors · [MIT 许可](/library/licenses/aiinfra-guide-MIT.txt)


## 本章简介

PyTorch 是 AI Infra 领域最主流的训练框架，也是后续分布式训练和推理优化的基础载体。本章目标是让你熟练掌握 PyTorch 的核心机制，能够独立完成模型开发和调试。

**Tensor 与自动微分**部分涵盖 Tensor 操作、CPU/GPU 设备管理、autograd 计算图机制以及梯度累积与清零。

**Module 与训练流程**部分走通完整训练循环：DataLoader → forward → loss → backward → optimizer.step，包括学习率调度和 Checkpoint 保存/加载。

**调试与性能分析**部分掌握 `torch.cuda.memory_summary()` 查看显存、`torch.profiler` 性能分析，以及常见错误排查（shape/device mismatch、OOM）。

**动手实验**：用 PyTorch 从零实现 GPT-2 级别小模型，在单卡上完成数据加载、训练、评估、保存的完整流程。
