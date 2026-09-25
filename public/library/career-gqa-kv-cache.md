# GQA 与 KV Cache：头共享、容量与增量一致性

> Career OS 原创教学单元 · 作者：Career OS 项目贡献者 · 更新：2026-09-25。本站原创教学补充；本轮未另行指定再分发许可。[来源与许可说明](/library/career-LICENSE.md)。

## 学习目标与先修知识

目标是解释 MHA、MQA、GQA 的头数关系，写出缓存 shape 与容量公式，并实现能通过 full-vs-incremental 对照的自注意力缓存。先掌握 [MHA 与 mask](/library/career-mha-masks)、[RoPE offset](/library/career-rope) 和 [Decoder Block](/library/career-decoder-block)。

## 为什么缓存 K/V

自回归生成时，过去 token 的 K/V 在同一层、同一组参数与既定位置下不需要每一步重新计算。新 token 的 Q 只查询历史和当前 K/V，旧 Q 的输出通常无需再计算。因此每层保存 K 和 V，下一步仅投影新输入并追加新 K/V。

缓存减少了重复投影与过去 query 的计算，但新 query 仍需访问其允许范围内的 key。它不等于“整个注意力每一步都是常数时间”，也不自动压缩上下文。教学实现用 `torch.cat` 追加，会复制历史数据；生产实现可用预分配等方式管理物理内存，数学语义应保持一致。[缓存概念文档](https://huggingface.co/docs/transformers/main/cache_explanation)

## MHA、MQA 与 GQA 的统一表示

令查询头数为 Hq，K/V 头数均为 Hkv：

| 结构 | 关系 | 共享方式 |
| --- | --- | --- |
| MHA | `Hkv=Hq` | 每个 query 头有独立 K/V |
| MQA | `Hkv=1` | 所有 query 头共享一组 K/V |
| GQA | `1<Hkv<Hq` 且 `Hq%Hkv=0` | 连续的一组 query 头共享 K/V |

若 `g=Hq/Hkv`，query 头 h 使用的 KV 组是 `floor(h/g)`。比如 Hq=8、Hkv=2，前四个 query 头使用 KV 组 0，后四个使用组 1。`repeat_interleave(g,dim=1)` 能明确表达这种布局；`repeat` 产生的交错顺序通常不同。

GQA 保留多个 KV 组，在共享程度与头的独立性之间提供一种结构选择。它不保证把任意 MHA 权重简单平均以后输出就完全相同；模型训练或转换策略需要另外评估。[GQA 原论文](https://arxiv.org/abs/2305.13245)

## shape 流转与缓存容量

本轮新 token 数为 N，历史长度为 P，每头特征维为 d：

| 对象 | 形状 |
| --- | --- |
| 新 Q | `[B,Hq,N,d]` |
| 新 K/V | `[B,Hkv,N,d]` |
| 历史 K/V | `[B,Hkv,P,d]` |
| 追加后 K/V | `[B,Hkv,P+N,d]` |
| attention scores | `[B,Hq,N,P+N]` |
| 输出 | `[B,Hq,N,d]` |

假设 L 层、每层相同头数、K/V 同 head 维度、每个元素占 s 字节，长度 T 的缓存容量为：

$$\mathrm{bytes}=2\cdot L\cdot B\cdot T\cdot H_{kv}\cdot d\cdot s.$$

最前面的 2 已经代表 K 和 V，不应再乘一次 2。例如 L=32、B=1、T=4096、Hkv=8、d=128、s=2，容量是 536,870,912 字节，即 512 MiB。此式不包含分配器开销、页面表、模型权重或其他激活；如果 K/V 维度、量化精度或层结构不同，需要逐项求和。容量按 Hkv 计算，而不是 Hq。

教学版 GQA 为了容易检查，显式扩展 K/V 到 Hq 后算 attention，这会暂时占用更多内存。优化 kernel 可直接按组读取共享 K/V；不要把演示实现的复制误当成 GQA 必须付出的缓存成本。[PyTorch SDPA 的 GQA 约束](https://docs.pytorch.org/docs/2.14/generated/torch.nn.functional.scaled_dot_product_attention.html)

## 增量解码必须同时对齐位置与 mask

使用 RoPE 时，新 Q/K 的 offset 等于历史缓存长度 P，旧 K 已经旋转，直接复用。新块内 query i 的绝对位置为 P+i，允许 key j 的条件是 `j<=P+i`，并与全部历史加新 token 的 `key_valid:[B,P+N]` 相与。

当 N=1 时，新 query 通常可见全部有效缓存；当 N>1 时，还必须屏蔽当前新块内部的未来 token。单 token 测试通过并不能证明多 token chunk 正确。padding key 被屏蔽后，query 位置仍按实际序列槽位前进；若采用压缩 position_ids，必须同步改变位置与缓存契约。

## 最小可运行示例

为了把两个概念集中到一段可读代码，下例直接接收已经投影且位置处理完毕的 Q/K/V，演示连续组共享与缓存追加。RoPE 原始投影的端到端版本在对应训练包中单独实现与验证。这里不调用高层 attention，使用相同随机输入比较全量和 `[2,1,3]` 分块解码。

```python
import math
import torch

torch.manual_seed(19)
torch.set_num_threads(1)

def gqa(q, k, v, allowed):
    hq, hkv = q.shape[1], k.shape[1]
    if hkv <= 0 or hq % hkv or v.shape[1] != hkv:
        raise ValueError('query heads must be divisible by matching KV heads')
    k = k.repeat_interleave(hq // hkv, dim=1)
    v = v.repeat_interleave(hq // hkv, dim=1)
    scores = ((q @ k.transpose(-2, -1)) / math.sqrt(q.shape[-1])).masked_fill(~allowed, -torch.inf)
    maximum = scores.amax(-1, keepdim=True)
    maximum = torch.where(torch.isfinite(maximum), maximum, torch.zeros_like(maximum))
    ex = (scores - maximum).exp()
    p = ex / ex.sum(-1, keepdim=True).clamp_min(torch.finfo(scores.dtype).tiny)
    return p @ v

def step(q, new_k, new_v, cache, valid):
    past = 0 if cache is None else cache[0].shape[-2]
    k = new_k if cache is None else torch.cat((cache[0], new_k), dim=-2)
    v = new_v if cache is None else torch.cat((cache[1], new_v), dim=-2)
    if valid.shape != (q.shape[0], k.shape[-2]):
        raise ValueError('valid must cover cached and new keys')
    qp = torch.arange(past, past + q.shape[-2])
    kp = torch.arange(k.shape[-2])
    allowed = (kp[None, :] <= qp[:, None])[None, None] & valid[:, None, None, :]
    return gqa(q, k, v, allowed), (k, v)

B, Hq, Hkv, T, d = 2, 4, 2, 6, 4
q = torch.randn(B, Hq, T, d, dtype=torch.float64)
k = torch.randn(B, Hkv, T, d, dtype=torch.float64)
v = torch.randn_like(k)
valid = torch.tensor([[True, True, False, True, True, True],
                      [True, False, True, True, True, True]])
full, _ = step(q, k, v, None, valid)
cache, outputs, start = None, [], 0
for count in (2, 1, 3):
    end = start + count
    out, cache = step(q[:, :, start:end], k[:, :, start:end], v[:, :, start:end], cache, valid[:, :end])
    outputs.append(out)
    assert cache[0].shape == (B, Hkv, end, d)
    start = end
torch.testing.assert_close(torch.cat(outputs, dim=-2), full, rtol=1e-9, atol=1e-10)

bytes_used = 2 * 32 * 1 * 4096 * 8 * 128 * 2
assert bytes_used == 512 * 1024**2
print('GQA grouping, chunk cache equivalence, capacity calculation: OK')
```

## 边界条件与真实验证

必须拒绝 Hq 不能整除 Hkv、K/V 头数不同、缓存 batch/head/dim 错误、缓存 dtype/device 不同，以及只给新片段有效性却遗漏历史 key 的 mask。全遮蔽 query 的输出仍按课程契约为零。

测试不能只检查 cache 长度增长。要用同一组投影权重，对比一次处理整段与多种切块方案的输出；在 KV 训练中，`[1,1,…]`、`[2,1,4]`、`[3,4]` 都与独立含 RoPE 的 SDPA 基准比较，还验证旧缓存未被原地修改。GQA 测试另外用两组明显不同的 V（2 与 20）检查分组顺序，防止输出 shape 正确但组对应错误。

这里没有测量 GPU 速度或生产内存收益。CPU 显式实现用于证明数学和缓存逻辑正确；实际性能还取决于 kernel、批处理、缓存分配、硬件与服务调度。

## 面试自检

1. 为什么通常不保存过去 Q？下一步需要新 query 对历史 K/V 求和，旧 query 的输出通常不再需要重复计算。
2. GQA 缓存减少多少？在其他条件相同的容量公式下，K/V 缓存按 `Hkv/Hq` 比例变化；不要把整个模型显存都按该比例缩小。
3. 为什么只测单 token 不够？它无法暴露新 chunk 内的未来信息泄漏。
4. 如何发现 offset 错误？比较同一输入的整段与多种分块输出，并用非零位置与独立 RoPE 数值基准。

## 对应训练

先完成 [KV Cache：全量与增量一致](/coding/torch-kv-cache?track=pytorch)，它包含投影、相邻配对 RoPE、causal/padding、旧缓存保护；再完成 [Grouped Query Attention](/coding/torch-gqa?track=pytorch)，练习从 MHA 到 MQA 的统一头映射。

两包均可在 CPU 运行，不依赖模型文件、GPU、API Key 或在线评测服务。代码下载后，自己的实现保存为 `solution.py`，与 `test_solution.py` 放在同一文件夹，运行 `python -m unittest -v`。
