# 第8章：生产级服务特性

> 来源：[AIInfraGuide](https://github.com/caomaolufei/AIInfraGuide/blob/a3b63eeb81d6d36a3c42c8cfc5a1bdd96e36bab1/docs/guides/%E6%A8%A1%E5%9D%97%E5%9B%9B-%E6%8E%A8%E7%90%86%E4%BC%98%E5%8C%96/%E7%AC%AC8%E7%AB%A0-%E7%94%9F%E4%BA%A7%E7%BA%A7%E6%9C%8D%E5%8A%A1%E7%89%B9%E6%80%A7.md) · 作者：草帽路飞（caomaolufei）及 AIInfraGuide contributors · [MIT 许可](/library/licenses/aiinfra-guide-MIT.txt)


## 本章简介

前几章聚焦"跑得快、装得下"，但真实业务把模型接进产品时，往往卡在另一类需求上：输出必须是合法 JSON、要能调用工具、要在一份权重上服务多个业务的 LoRA、要处理图文混合输入。本章系统梳理 vLLM 面向生产的服务特性——它们不改变推理速度的上限，却决定了模型能不能真正落地。

**结构化输出**解决"模型输出不可控"的痛点：通过 xgrammar / guidance 后端，用 JSON Schema、正则或语法约束强制模型只生成合法 Token。介绍受约束解码（Constrained Decoding）的原理、cFSM 加速，以及在 vLLM 中开启结构化输出的方式。

**Tool Calling 与 Reasoning Parser**讲清 vLLM 如何解析模型输出中的工具调用请求与推理过程（如思维链），对接 OpenAI 兼容的 `tools` / `tool_choice` 协议，支撑 Agent 应用。

**Multi-LoRA 服务**针对"一套底座权重 + 多个业务微调"的场景：vLLM 如何在同一引擎中动态加载/切换多个 LoRA Adapter，实现单卡服务多租户，以及对显存和调度的影响。

**多模态推理（VLM）**覆盖图文/音视频等多模态大模型的推理链路：多模态输入预处理、Encoder Cache、图像 Hash 前缀缓存，以及 vLLM 对主流 VLM 的支持。

**采样与解码算法**梳理 Temperature/Top-p/Top-k、Logprobs、并行采样（`n`）、Beam Search 等采样参数的语义与工程实现，以及它们对延迟和质量的影响。

## 本章小节

- **8.1 结构化输出**：JSON Schema、受约束解码、xgrammar/guidance、cFSM
- **8.2 Tool Calling 与 Reasoning Parser**：工具调用协议、思维链解析、Agent 对接
- **8.3 Multi-LoRA 服务**：动态 Adapter 加载、单卡多租户
- **8.4 多模态推理（VLM）**：多模态预处理、Encoder Cache、前缀缓存
- **8.5 采样与解码算法**：采样参数、Logprobs、并行采样、Beam Search
