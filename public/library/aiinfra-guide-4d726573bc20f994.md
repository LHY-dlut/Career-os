# 第12章：端侧推理

> 来源：[AIInfraGuide](https://github.com/caomaolufei/AIInfraGuide/blob/a3b63eeb81d6d36a3c42c8cfc5a1bdd96e36bab1/docs/guides/%E6%A8%A1%E5%9D%97%E5%9B%9B-%E6%8E%A8%E7%90%86%E4%BC%98%E5%8C%96/%E7%AC%AC12%E7%AB%A0-%E7%AB%AF%E4%BE%A7%E6%8E%A8%E7%90%86.md) · 作者：草帽路飞（caomaolufei）及 AIInfraGuide contributors · [MIT 许可](/library/licenses/aiinfra-guide-MIT.txt)


## 本章简介

把模型部署到手机、汽车、摄像头、PC 或嵌入式设备，与把模型部署到数据中心并不是同一道题。端侧设备的内存、功耗、散热和软件环境更加受限，硬件型号却更加分散；一次算得很快并不等于能够持续稳定地运行。

本章从完整工程链路出发，介绍模型如何从 PyTorch 导出为端侧程序，运行时如何把计算分配给 CPU、GPU、NPU 或 DSP，以及如何通过量化、图优化、内存规划和性能评测构建可靠的端侧推理系统。

## 本章小节

- **12.1 端侧推理基础：从模型导出到异构硬件执行**：端侧约束、软硬件栈、运行时选型、优化方法、Benchmark 与 ExecuTorch/XNNPACK 最小实例
