# RoPE：旋转、相对位置与缓存偏移

> Career OS 原创教学单元 · 作者：Career OS 项目贡献者 · 更新：2026-09-25。本站原创教学补充；本轮未另行指定再分发许可。[来源与许可说明](/library/career-LICENSE.md)。

## 学习目标与先修知识

本单元帮助你区分相加式正弦位置编码与 RoPE，推导二维旋转带来的相对位置关系，并正确处理分块解码的 position offset。先理解 Q/K 点积、二维旋转矩阵和 `[B,H,T,d]` 布局；需要偶数维配对的概念，不需要掌握复杂数值分析。

## 为什么 attention 需要位置信息

单看 token 向量做两两注意力，计算没有直接编码“第几个位置”。因果 mask 提供可见范围，但仍不等于精细的相对距离表示。位置编码给模型额外的顺序信号。

Transformer 的正弦位置编码在输入处相加，频率跨维度变化：

$$PE(p,2i)=\sin(p\cdot10000^{-2i/D}),\qquad PE(p,2i+1)=\cos(p\cdot10000^{-2i/D}).$$

这里 p 为绝对位置，i 为维度对的索引，D 为模型维度；编码 shape 是 `[T,D]`，可以广播加到 `[B,T,D]`。[Transformer 原论文，§3.5](https://arxiv.org/abs/1706.03762)

RoPE 选择对每头 Q/K 的维度对施加旋转，而不是向 Q/K 直接加一个位置向量。本文采用相邻维配对 `(0,1),(2,3),…`，head 维度 d 必须为正偶数。

## 二维旋转公式与相对位置

第 i 对的频率 `θ_i=base^(-2i/d)`，位置 p 的旋转角度 `α=pθ_i`：

$$R(\alpha)=\begin{bmatrix}\cos\alpha&-\sin\alpha\\\sin\alpha&\cos\alpha\end{bmatrix},\qquad
\begin{bmatrix}x'_{2i}\\x'_{2i+1}\end{bmatrix}=R(p\theta_i)\begin{bmatrix}x_{2i}\\x_{2i+1}\end{bmatrix}.$$

正交旋转保持每一对向量的长度，所以也保持整个向量的 L2 范数。对位置 m 的 q 和位置 n 的 k，有：

$$\langle R(m\theta)q,R(n\theta)k\rangle=q^\mathsf{T}R((n-m)\theta)k.$$

这是因为 `R(mθ)ᵀR(nθ)=R((n-m)θ)`。位置共同平移同一个偏移，点积不变；位置差则进入了旋转角度。该恒等式解释 RoPE 的相对位置结构，不意味着任意 q/k 的点积都会随距离单调下降，也不意味着模型可以无条件外推到任意长度。[RoFormer 原论文](https://arxiv.org/abs/2104.09864)

## shape 流转与布局约定

| 对象 | 形状 |
| --- | --- |
| Q 或 K | `[B,H,T,d]` |
| 相邻 even、odd 分量 | `[B,H,T,d/2]` |
| 位置 × 频率得到的角度 | `[T,d/2]` |
| 广播旋转后交错还原 | `[B,H,T,d]` |

部分模型代码采用前半维与后半维配对布局。两种布局都可以表达旋转，但权重排列、缓存和输入必须与布局一致；不能直接把一个实现的索引方式换成另一个，同时期待已有权重数值不变。本课程与测试统一使用相邻成对布局。

## offset 为什么决定增量正确性

全量输入 T 个 token 时，位置是 `0..T-1`。已有 P 个缓存 token 后，新片段长度 Q 的位置应为 `P..P+Q-1`。因此新 Q/K 的 RoPE 调用使用 `offset=P`。缓存里的旧 K 已经在原位置旋转过，不能在每一步再次旋转；否则累计角度会错误地增长。

本练习使用同一批样本相同的绝对 offset；变长 batch、压缩缓存、滑动窗口或独立 position_ids 需要更丰富的契约，不能仅靠一个标量 offset 表达所有情况。

## 最小可运行示例

以下代码包含相邻配对旋转、范数检查、分块检查与共同平移检查。float64 便于做严格数值对照；真实低精度推理常用更高精度计算角度再转换，不能只按输出 dtype 计算很大的位置角度。

```python
import torch

torch.manual_seed(13)

def rope(x, offset=0, base=10000.0):
    if x.ndim != 4 or x.shape[-1] == 0 or x.shape[-1] % 2:
        raise ValueError('expected [B,H,T,d] with positive even d')
    if not isinstance(offset, int) or offset < 0:
        raise ValueError('offset must be a nonnegative integer')
    d = x.shape[-1]
    freq = base ** (-torch.arange(0, d, 2, device=x.device, dtype=torch.float64) / d)
    pos = torch.arange(offset, offset + x.shape[-2], device=x.device, dtype=torch.float64)
    angle = pos[:, None] * freq[None, :]
    even, odd = x[..., 0::2], x[..., 1::2]
    paired = torch.stack((even * angle.cos() - odd * angle.sin(),
                          even * angle.sin() + odd * angle.cos()), dim=-1)
    return paired.flatten(-2).to(x.dtype)

x = torch.randn(2, 3, 7, 8, dtype=torch.float64)
torch.testing.assert_close(rope(x).square().sum(-1), x.square().sum(-1))
torch.testing.assert_close(rope(x[:, :, 4:], offset=4), rope(x)[:, :, 4:])

q = torch.randn(1, 1, 1, 8, dtype=torch.float64)
k = torch.randn_like(q)
before = (rope(q, 3) * rope(k, 8)).sum(-1)
after = (rope(q, 10) * rope(k, 15)).sum(-1)
torch.testing.assert_close(before, after)

one = torch.tensor([[[[1., 0.]]]], dtype=torch.float64)
expected = torch.tensor([torch.cos(torch.tensor(1.)), torch.sin(torch.tensor(1.))], dtype=torch.float64)
torch.testing.assert_close(rope(one, 1).flatten(), expected, rtol=1e-6, atol=1e-7)
print('RoPE norm, chunk offset, relative position: OK')
```

## 边界条件与常见错误

本训练拒绝奇数 d、非浮点输入、负 offset 和非正 base。正弦编码允许长度 0 返回空表；RoPE 对空 T 可以自然得到空输出，但调用它的注意力缓存题要求本次至少有一个新 token。

仅验证范数不够：旋转符号写反或错误位置仍可能保持范数。要同时比较独立复数乘法、非零 offset、整段与分块，以及共同平移后的点积。复杂度为 `O(BHTd)`，sin/cos 表可在 batch/head 之间共享，占 `O(Td)`；缓存频率表可减少重复计算，但不改变公式。

不要承诺“加 RoPE 就可以无限上下文”。训练长度、频率选择和位置分布都会影响外推；长上下文扩展策略超出本单元的实现范围。

## 面试自检

1. RoPE 为什么常应用于 Q/K？位置差需要进入用于注意力权重的点积；V 通常保留要汇聚的内容表示。
2. 相对位置从哪条等式得来？应写出 `R(m)ᵀR(n)=R(n-m)`，而不只说“sin/cos 带来了位置”。
3. cache 内旧 K 是否重旋转？不需要，它已经处于自己的绝对位置；只为新 Q/K 使用正确 offset。
4. 范数保持是否能证明正确？不能，还需独立数值和位置对齐测试。

## 对应训练与继续阅读

完成 [正弦位置编码](/coding/torch-sinusoidal?track=pytorch) 与 [RoPE 旋转及 offset](/coding/torch-rope?track=pytorch)。这两个训练的配对布局、dtype 与非法输入规则在题目中明确给出。

接着阅读 [Decoder Block](/library/career-decoder-block)，并在 [GQA 与 KV Cache](/library/career-gqa-kv-cache) 中验证 full-vs-incremental 一致性。
