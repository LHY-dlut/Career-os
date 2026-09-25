# Scaled Dot-Product Attention：数值、mask 与可检验实现

> Career OS 原创教学单元 · 作者：Career OS 项目贡献者 · 更新：2026-09-25。本站原创教学补充；本轮未另行指定再分发许可。[来源与许可说明](/library/career-LICENSE.md)。本页解释和代码独立编写，原论文与官方文档链接用于核实技术定义。

## 学习目标与先修知识

学完后应能手写缩放点积注意力，解释 `1/√d`、稳定 softmax 和 mask 的运算顺序，并用数值测试证明未来 token 没有泄漏。先完成 [Tensor 形状](/library/career-tensor-shapes)，理解矩阵乘法、指数函数以及按行归一化。

## 从相似度到信息汇聚

Query 表示当前位置需要查找什么，Key 表示候选位置可匹配的特征，Value 承载最后被汇聚的信息。这是理解计算分工的直觉；Q/K/V 在模型中通常都是输入经过不同的可学习投影，不是手工定义的“问题、标签、答案”。

每个 query 和所有 key 做点积，得到一行分数；softmax 将这一行变成权重；再按权重对 V 求和。令 Q、K 的每头特征维为 d，V 的特征维为 dv：

$$S=\frac{QK^\mathsf{T}}{\sqrt d},\qquad P_{ij}=\frac{\exp(S_{ij})}{\sum_k\exp(S_{ik})},\qquad O=PV.$$

| 张量 | 形状 |
| --- | --- |
| Q | `[B,H,Tq,d]` |
| K | `[B,H,Tk,d]` |
| V | `[B,H,Tk,dv]` |
| S、P | `[B,H,Tq,Tk]` |
| O | `[B,H,Tq,dv]` |

Q 与 K 的 d 必须相等，K 与 V 的 Tk 必须相等；dv 不必等于 d。沿最后的 key 轴做 softmax，含义是“这个 query 如何分配对不同 key 的权重”。

## 为什么除以 √d

在用于分析的简化假设下，q、k 各分量零均值、单位方差且相互独立，d 项乘积之和的方差随 d 增长。除以 √d 能控制分数尺度，减少 softmax 过早变得极尖的倾向。这个推导解释了设计动机，并不是声称真实训练中的分量一直独立或方差恒为 1。[Transformer 原论文，§3.2.1](https://arxiv.org/abs/1706.03762)

注意这里除数由 Q/K 特征维决定，不是 token 长度、head 数或 V 的维度。测试时让这些维度取不同值，有助于识别错误缩放。

## 稳定 softmax 和全遮蔽行

对正常有限分数，令 `m=max(s)`，将分子分母同时乘以 `exp(-m)`，得到：

$$\operatorname{softmax}(s)_j=\frac{e^{s_j-m}}{\sum_k e^{s_k-m}}.$$

这不会改变数学结果，却避免对很大的正数直接取指数。为了做 mask，我们将不可见分数设成 `-inf`，它的指数为零。如果整行都不可见，普通 softmax 的 `-inf-(-inf)` 会产生 NaN，因此本课程显式约定：全遮蔽行的概率和输出都为零。这是扩展行为，不是普通 softmax 对所有输入都天然成立的性质。

实现时先把全遮蔽行的最大值替换为 0，再对分母做有限的下限保护。不要先除以零再指望最后用 `where` 修复；前面的 NaN 可能已经影响梯度。半精度输入的累加在 float32 中完成，最后再转换回原 dtype。

## 一套明确的 mask 语义

本课程 `allowed=True` 表示可见，`False` 表示屏蔽，mask 需要能广播到 `[B,H,Tq,Tk]`。这是 PyTorch SDPA 布尔 mask 的含义；`nn.MultiheadAttention` 的 `key_padding_mask=True` 则表示忽略，需要转换。不同接口中同样叫 mask 的参数不一定方向相同。[SDPA 文档](https://docs.pytorch.org/docs/2.14/generated/torch.nn.functional.scaled_dot_product_attention.html)

mask 必须作用在 softmax 前的分数上。如果先 softmax 再把一部分概率改成零，剩余概率通常不再和为 1。比如两个等分数 key，其中一个被屏蔽：正确结果是剩下的 key 权重为 1，而不是 0.5。

## 最小可运行示例

下面使用 float64，关闭 dropout，并以 PyTorch SDPA 做独立数值对照。保存后运行无需模型和 GPU。

```python
import math
import torch
import torch.nn.functional as F

torch.manual_seed(7)
torch.set_num_threads(1)

def safe_softmax(scores):
    maximum = scores.amax(-1, keepdim=True)
    maximum = torch.where(torch.isfinite(maximum), maximum, torch.zeros_like(maximum))
    numerator = torch.exp(scores - maximum)
    return numerator / numerator.sum(-1, keepdim=True).clamp_min(torch.finfo(scores.dtype).tiny)

def attention(q, k, v, allowed):
    scores = (q @ k.transpose(-2, -1)) / math.sqrt(q.shape[-1])
    scores = scores.masked_fill(~allowed, -torch.inf)
    return safe_softmax(scores) @ v

q = torch.randn(1, 2, 3, 4, dtype=torch.float64)
k = torch.randn(1, 2, 3, 4, dtype=torch.float64)
v = torch.randn(1, 2, 3, 5, dtype=torch.float64)
causal = torch.ones(3, 3, dtype=torch.bool).tril()[None, None]
actual = attention(q, k, v, causal)
expected = F.scaled_dot_product_attention(q, k, v, attn_mask=causal, dropout_p=0.0)
torch.testing.assert_close(actual, expected, rtol=1e-9, atol=1e-10)

v_changed = v.clone()
v_changed[:, :, 2] += 1000  # future value for queries 0 and 1
torch.testing.assert_close(attention(q, k, v_changed, causal)[:, :, :2], actual[:, :, :2])
all_hidden = torch.zeros_like(causal)
torch.testing.assert_close(attention(q, k, v, all_hidden), torch.zeros_like(actual))
print('attention numeric equivalence, causality, all-masked rows: OK')
```

## 边界条件、成本与常见错误

实际训练题额外验证 Q/K/V rank、batch/head 对齐、相同浮点 dtype/device、有限输入、非空序列以及 bool mask 的广播合法性。最小示例省略这些防御性检查以突出运算顺序；完成练习时应补齐。

显式计算分数的时间为 `O(B·H·Tq·Tk·(d+dv))`，分数与概率矩阵占 `O(B·H·Tq·Tk)` 空间。这说明长序列的内存压力来自位置两两配对；优化 kernel 可以改变中间矩阵的物化方式，但不改变这里定义的数学输出。

常见失误包括缩放轴错误、对 query 轴做 softmax、误把 mask 的 True 当作屏蔽、全遮蔽产生 NaN，以及比较时遗漏 dropout。SDPA 会按显式传入的 `dropout_p` 应用 dropout，单独设置调用方 `.eval()` 不能替代 `dropout_p=0.0`。

## 面试自检

1. 为什么要缩放点积？应说明简化方差推导与 softmax 尺度，不把独立假设说成训练保证。
2. 如何检查 mask 的方向？构造两个 V 值不同的 key，只允许一个，直接检查输出是否等于那个 V。
3. 如何检查因果性？固定过去输入，只大幅改变未来的 K/V，过去 query 的输出不应变化。
4. 为什么仅检查 shape 不够？错误缩放、错误 mask、返回全零都可能得到正确 shape。

## 对应训练与继续阅读

先做 [稳定 Softmax](/coding/torch-softmax?track=pytorch)，再做 [Scaled Dot-Product Attention](/coding/torch-attention?track=pytorch)。本课程参考答案通过 CPU 数值、梯度与遮蔽行为测试；下载测试与自己的 `solution.py` 后可本地复现。

下一单元：[多头注意力与 causal/padding mask](/library/career-mha-masks)。
