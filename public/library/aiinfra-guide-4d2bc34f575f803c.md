# 第1章：CUDA 编程入门

> 来源：[AIInfraGuide](https://github.com/caomaolufei/AIInfraGuide/blob/a3b63eeb81d6d36a3c42c8cfc5a1bdd96e36bab1/docs/guides/%E6%A8%A1%E5%9D%97%E4%BA%8C-CUDA%E7%BC%96%E7%A8%8B%E4%B8%8E%E7%AE%97%E5%AD%90%E4%BC%98%E5%8C%96/%E7%AC%AC1%E7%AB%A0-CUDA%E7%BC%96%E7%A8%8B%E5%85%A5%E9%97%A8.md) · 作者：草帽路飞（caomaolufei）及 AIInfraGuide contributors · [MIT 许可](/library/licenses/aiinfra-guide-MIT.txt)


## 本章简介

本章是 CUDA 编程的起点，带你从零搭建开发环境并写出第一个高性能 Kernel。

**开发环境搭建**涵盖 CUDA Toolkit 安装与版本管理、nvcc 编译工具链和 CMake 集成，以及编写第一个 Hello World kernel。

**编程模型**部分详解 Grid/Block/Thread 三级线程层次、线程索引计算（threadIdx/blockIdx/blockDim/gridDim）、Kernel Launch 语法 `<<<gridDim, blockDim>>>` 以及 Block 大小的选择策略。

**内存模型**部分介绍全局内存、共享内存、寄存器、常量内存和统一内存的特性与适用场景。

**第一个实用 Kernel**以向量加法为例，走通 cudaMalloc → cudaMemcpy → kernel launch → 错误检查的完整流程，并对比 CPU 和 GPU 耗时。
