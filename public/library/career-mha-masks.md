# 多头注意力：投影、分头与 causal/padding mask

> Career OS 原创教学单元 · 作者：Career OS 项目贡献者 · 更新：2026-09-25。本站原创教学补充；本轮未另行指定再分发许可。[来源与许可说明](/library/career-LICENSE.md)。

## 学习目标与先修知识

目标是把单个 attention 计算组装成完整 Multi-Head Attention（MHA），同时准确区分 causal mask、key padding 与 query padding。先理解 [缩放点积注意力](/library/career-scaled-attention) 和 `[B,T,D] ↔ [B,H,T,d]` 的元素对应。

## 为什么需要多头与输出投影

每个头在自己的特征子空间中计算注意力。不同头有不同 Q/K/V 投影，可以学习不同的信息选择方式；这提供表达能力，但不能据此保证某个头总会对应固定的人类可解释语义。

本文采用 bias-free self-attention 和零 dropout，以便清楚地做数值对照。PyTorch Linear 权重按 `[out,in]` 保存，故 Q 投影写作 `X @ Wq.T`。将投影结果拆成 H 个头后，每头独立计算：

$$Q=XW_Q^\mathsf{T},\quad K=XW_K^\mathsf{T},\quad V=XW_V^\mathsf{T},$$
$$O=\operatorname{Concat}(\operatorname{head}_1,\ldots,\operatorname{head}_H)W_O^\mathsf{T}.$$

四个权重均为 `[D,D]`；固定 D 时，分头不会因为 H 增加就自动增加这四个投影的参数总数。每头维度变成 `d=D/H`。输出投影让来自不同头的特征重新组合，输出仍是 `[B,T,D]`，因此可以与输入做残差相加。[Transformer 原论文，§3.2.2](https://arxiv.org/abs/1706.03762)

| 运算 | 输出形状 |
| --- | --- |
| 输入、Q/K/V 投影 | `[B,T,D]` |
| 拆头并交换 T/H | `[B,H,T,d]` |
| 分数与概率 | `[B,H,T,T]` |
| 每头输出 | `[B,H,T,d]` |
| 合头、输出投影 | `[B,T,D]` |

## 三种容易混淆的遮蔽

**Causal mask** 约束 query i 只访问位置 j≤i，防止未来信息泄漏。含对角线，因为预测下一个 token 时，当前位置本身已经是可见输入。

**Key padding mask** 将补齐序列用的 key 排除。设 `key_valid:[B,T]`，True 表示真实 key，扩展成 `[B,1,1,T]` 后，对所有头和 query 共用。

**Query padding** 是另一项输出/损失处理策略。仅屏蔽 key 不会使 padding query 的最终输出自动为零；它可能仍看到有效 key，残差路径也会保留输入。如果训练不应计算 padding 位置的损失，需要在损失或输出处明确处理，不能只改 key mask。

统一的可见性为：

$$A_{b,1,i,j}=(j\leq i)\land\mathrm{key\_valid}_{b,j}.$$

例如 `key_valid=[True,False,True]`，三行分别可见 `{0}`、`{0}`、`{0,2}`。第二个 query 并不因为自身处于 padding 就自动被抹去。全遮蔽行的 attention 输出在本课程中定义为零。

当已有 P 个缓存 token，而这次输入 Q 个新 token 时，query 的绝对位置是 P+i，所以规则应是 `j<=P+i`。这里的 `[Q,P+Q]` 不是从左上角截取的普通下三角矩阵，遗漏 offset 会丢失大量本该可见的历史 key。

## 最小可运行示例

下面显式实现投影、分头、mask、softmax 和合头，并将同一组权重装入 `nn.MultiheadAttention` 核对结果。对照接口里的 mask True 含义与本页相反，因此使用 `~causal` 和 `~key_valid`。这也是测试的一部分，而不是随意取反。[PyTorch SDPA mask 说明](https://docs.pytorch.org/docs/2.14/generated/torch.nn.functional.scaled_dot_product_attention.html)

```python
import math
import torch

torch.manual_seed(11)
torch.set_num_threads(1)
B, T, D, H = 2, 4, 8, 2
d = D // H
x = torch.randn(B, T, D, dtype=torch.float64)
wq, wk, wv, wo = [torch.randn(D, D, dtype=x.dtype) * 0.2 for _ in range(4)]
key_valid = torch.tensor([[True, True, False, True], [True, True, True, False]])
causal = torch.ones(T, T, dtype=torch.bool).tril()
allowed = causal[None, None] & key_valid[:, None, None, :]

def split(z):
    return z.reshape(B, T, H, d).transpose(1, 2)

q, k, v = [split(x @ w.T) for w in (wq, wk, wv)]
scores = ((q @ k.transpose(-2, -1)) / math.sqrt(d)).masked_fill(~allowed, -torch.inf)
maximum = scores.amax(-1, keepdim=True)
maximum = torch.where(torch.isfinite(maximum), maximum, torch.zeros_like(maximum))
numerator = (scores - maximum).exp()
probability = numerator / numerator.sum(-1, keepdim=True).clamp_min(torch.finfo(x.dtype).tiny)
manual = (probability @ v).transpose(1, 2).reshape(B, T, D) @ wo.T

oracle = torch.nn.MultiheadAttention(D, H, bias=False, dropout=0., batch_first=True).double().eval()
with torch.no_grad():
    oracle.in_proj_weight.copy_(torch.cat((wq, wk, wv), dim=0))
    oracle.out_proj.weight.copy_(wo)
expected, _ = oracle(x, x, x, attn_mask=~causal, key_padding_mask=~key_valid, need_weights=False)
torch.testing.assert_close(manual, expected, rtol=1e-9, atol=1e-10)
assert manual.shape == (B, T, D)

offset, chunk = 3, 2
query_pos = torch.arange(offset, offset + chunk)
key_pos = torch.arange(offset + chunk)
chunk_causal = key_pos[None, :] <= query_pos[:, None]
assert chunk_causal.tolist() == [[True, True, True, True, False], [True] * 5]
print('same-parameter MHA and chunk causal mask: OK')
```

## 边界条件与排错

应先拒绝 D 不能整除 H、非正 H、非法权重形状以及不能广播的 mask。不能用 `reshape`、截断或广播去掩盖这些输入错误。全遮蔽 attention 输出为零时，无 bias 输出投影仍为零；如果你后来添加了输出 bias，零分支经过该投影后可能变成 bias，需要重新定义预期。

固定随机种子只能控制随机输入，不会自动对齐两个不同初始化的模型。比较 MHA 时必须复制相同参数，统一权重方向、bias、mask 与 dropout。只比较两个结果的 shape 或平均值不能证明实现正确。

投影时间约 `O(BTD²)`，注意力约 `O(BT²D)`；显式分数占 `O(BHT²)`。H 增加时，虽然总 D 固定，但显式分数中多一个头维，内存与 kernel 行为仍可能变化。

## 面试自检

1. 如何证明 MHA 没有混错 token/head？应先验证分头元素映射，再和同权重实现逐元素比较。
2. padding key 与 padding query 差在哪？前者影响信息来源，后者影响哪些输出或损失应被保留。
3. cache 中已存在 7 个 token，本轮输入 2 个 token，mask 是多大？是 `[B,1,2,9]`，两行最多看到绝对位置 7 和 8。
4. 全遮蔽行为应该放在哪里处理？在注意力归一化中保证有限零输出，并考虑后续 bias/残差的含义。

## 对应训练与继续阅读

完成 [Causal 与 padding mask 合并](/coding/torch-masks?track=pytorch) 和 [手写 MHA](/coding/torch-mha?track=pytorch)。训练覆盖同权重数值对照、未来扰动、全遮蔽与非法 shape。

下一单元：[RoPE 与位置编码](/library/career-rope)；之后用 [Decoder Block](/library/career-decoder-block) 把这些组件组合起来。
