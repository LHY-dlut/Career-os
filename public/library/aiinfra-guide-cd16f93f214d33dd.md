# 第10章：生产部署与运维

> 来源：[AIInfraGuide](https://github.com/caomaolufei/AIInfraGuide/blob/a3b63eeb81d6d36a3c42c8cfc5a1bdd96e36bab1/docs/guides/%E6%A8%A1%E5%9D%97%E5%9B%9B-%E6%8E%A8%E7%90%86%E4%BC%98%E5%8C%96/%E7%AC%AC10%E7%AB%A0-%E7%94%9F%E4%BA%A7%E9%83%A8%E7%BD%B2%E4%B8%8E%E8%BF%90%E7%BB%B4.md) · 作者：草帽路飞（caomaolufei）及 AIInfraGuide contributors · [MIT 许可](/library/licenses/aiinfra-guide-MIT.txt)


## 本章简介

前面章节让推理服务"跑得又快又省"，本章解决"稳定地服务真实流量"的问题：如何打包、编排、观测、扩缩容和做容量规划。这是从 Demo 到生产的最后一公里，以 vLLM 部署为实例。

**容器化与 Kubernetes 部署**讲清如何把 vLLM 服务打成镜像并在 K8s 上编排：GPU 资源请求、就绪/存活探针（注意模型加载耗时长，探针阈值要放宽）、镜像与权重的拉取策略，以及 vLLM Production Stack、KServe 等生产部署方案。

**可观测性**是运维的眼睛：vLLM 暴露 Prometheus 指标端点（TTFT、TPOT、running/waiting 请求数、KV Cache 利用率、抢占次数等），配合 Grafana 看板和结构化日志，做到故障可定位、性能可追踪。

**自动扩缩容与负载均衡**覆盖多副本部署下的请求分发：基于 QPS / 队列长度 / KV Cache 利用率的 HPA 扩缩容，以及前缀感知（Prefix-aware）路由如何把命中同一 System Prompt 的请求导向同一副本以提升缓存命中率。

⚠️ **安全提示**：vLLM 的 OpenAI 兼容服务默认不做认证，直接暴露到公网等于开放算力与数据。生产部署务必在网关层加上 API Key 校验、TLS 与网络隔离——本章会明确这一点，避免"裸奔"上线。

**容量规划**给出从 SLO 和峰值 QPS 反推所需 GPU 数量的方法：结合单副本压测得到的吞吐上限、显存约束和冗余系数，估算集群规模与成本。

## 本章小节

- **10.1 容器化与 Kubernetes 部署**：镜像、GPU 调度、探针、Production Stack/KServe
- **10.2 可观测性**：Prometheus 指标、Grafana 看板、日志与告警
- **10.3 自动扩缩容与负载均衡**：HPA 策略、前缀感知路由、认证与安全
- **10.4 容量规划**：从 SLO 与峰值 QPS 反推集群规模与成本
