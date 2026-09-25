# Decoder Block：归一化、FFN 与残差的完整组合

> Career OS 原创教学单元 · 作者：Career OS 项目贡献者 · 更新：2026-09-25。本站原创教学补充；本轮未另行指定再分发许可。[来源与许可说明](/library/career-LICENSE.md)。

## 学习目标与先修知识

目标是把 attention、归一化、FFN 和残差按正确顺序组合成一个最小 decoder block，并理解哪些性质属于组件、哪些属于完整模型。先掌握 [多头注意力](/library/career-mha-masks)、均值/方差与基本自动微分。

本单元选择 pre-norm、bias-free attention、精确 GELU、零 dropout。它不包含交叉注意力、最终归一化、词表输出头、训练损失或采样，所以是一个可验证的模块，不是能够独立生成文本的语言模型。位置编码在 [RoPE 单元](/library/career-rope) 学习，并在缓存训练中整合。

## LayerNorm 与 RMSNorm 各自计算什么

对每个 token 的 D 维向量 x，LayerNorm 计算：

$$\mu=\frac1D\sum_jx_j,\quad \sigma^2=\frac1D\sum_j(x_j-\mu)^2,\quad
\operatorname{LN}(x)_j=\gamma_j\frac{x_j-\mu}{\sqrt{\sigma^2+\epsilon}}+\beta_j.$$

统计轴是最后的特征维；不同 batch 和 token 独立计算。方差分母是 D，不是 D-1。`γ,β:[D]` 是可学习参数，eps 防止常数输入或极小方差带来的数值问题。[LayerNorm 文档](https://docs.pytorch.org/docs/2.14/generated/torch.nn.LayerNorm.html)

RMSNorm 省去均值中心化，通常也没有 bias：

$$\operatorname{RMSNorm}(x)_j=\gamma_j\frac{x_j}{\sqrt{\frac1D\sum_kx_k^2+\epsilon}}.$$

它保留了对输入尺度的规范化，却不会让输出天然零均值。比较两个实现时要显式统一 eps；不同接口的默认 eps 不一定相同。本训练对两种归一化都显式使用 `eps=1e-5`，半精度统计用 float32 累加。[RMSNorm 文档](https://docs.pytorch.org/docs/2.14/generated/torch.nn.RMSNorm.html)

## FFN 是逐 token 的非线性变换

FFN 先扩大最后一维，再经过非线性，最后压回 D：

$$Z=XW_1^\mathsf{T}+b_1,\quad \operatorname{FFN}(X)=\operatorname{GELU}(Z)W_2^\mathsf{T}+b_2,$$
$$\operatorname{GELU}(z)=\frac z2\left(1+\operatorname{erf}\left(\frac z{\sqrt2}\right)\right).$$

权重 `W1:[F,D]`、`W2:[D,F]`，隐藏激活是 `[B,T,F]`。本课采用精确 erf 公式，不能把 tanh 近似结果拿来做极严格数值对照。FFN 只变换单个 token 的特征，跨 token 混合在 attention 中发生。[GELU 文档](https://docs.pytorch.org/docs/2.14/generated/torch.nn.functional.gelu.html)

## Pre-Norm 残差的运算顺序

本课 block 的两个子层为：

$$Y=X+\operatorname{MHA}(\operatorname{LN}_1(X)),\qquad
Z=Y+\operatorname{FFN}(\operatorname{LN}_2(Y)).$$

残差保留未经该分支变换的输入。如果一个分支恒为零，该子层输出就是输入；反向传播也存在直接的恒等路径。分支输出必须与输入形状严格一致，不能依靠广播补齐。

Post-Norm 把归一化放在残差相加后，例如 `LN(X+MHA(X))`，两者函数与梯度路径不同。原始 Transformer 示意主要采用 Post-Norm；本教程明确选择常见的 Pre-Norm 教学结构，不把两者说成完全相同。[Transformer 原论文](https://arxiv.org/abs/1706.03762)、[归一化位置研究](https://arxiv.org/abs/2002.04745)

| 阶段 | 形状 |
| --- | --- |
| X、LN1(X) | `[B,T,D]` |
| Q/K/V 分头 | `[B,H,T,D/H]` |
| causal + key padding | `[B,1,T,T]` |
| attention 输出、Y | `[B,T,D]` |
| LN2(Y) 的 FFN 隐层 | `[B,T,F]` |
| 第二个残差 Z | `[B,T,D]` |

## 最小可运行示例

下面手写核心运算。代码中的 `reference` 使用独立 PyTorch 函数组合核对数值；没有把手写实现本身又当作测试答案。示例固定权重与 mask，且不启用 dropout。

```python
import math
import torch
import torch.nn.functional as F

torch.manual_seed(17)
torch.set_num_threads(1)
B, T, D, H, Fdim = 1, 4, 8, 2, 12
x = torch.randn(B, T, D, dtype=torch.float64)
wq, wk, wv, wo = [torch.randn(D, D, dtype=x.dtype) * .2 for _ in range(4)]
w1 = torch.randn(Fdim, D, dtype=x.dtype) * .2
w2 = torch.randn(D, Fdim, dtype=x.dtype) * .2
b1, b2 = torch.randn(Fdim, dtype=x.dtype), torch.randn(D, dtype=x.dtype)
gamma, beta = torch.ones(D, dtype=x.dtype), torch.zeros(D, dtype=x.dtype)
valid = torch.tensor([[True, True, False, True]])
allowed = torch.ones(T, T, dtype=torch.bool).tril()[None, None] & valid[:, None, None, :]

def ln(z):
    centered = z - z.mean(-1, keepdim=True)
    return centered * torch.rsqrt(centered.square().mean(-1, keepdim=True) + 1e-5) * gamma + beta

def split(z):
    return z.reshape(B, T, H, D // H).transpose(1, 2)

def block(z):
    norm = ln(z)
    q, k, v = [split(norm @ w.T) for w in (wq, wk, wv)]
    scores = ((q @ k.transpose(-2, -1)) / math.sqrt(D // H)).masked_fill(~allowed, -torch.inf)
    maximum = scores.amax(-1, keepdim=True)
    maximum = torch.where(torch.isfinite(maximum), maximum, torch.zeros_like(maximum))
    ex = (scores - maximum).exp()
    p = ex / ex.sum(-1, keepdim=True).clamp_min(torch.finfo(z.dtype).tiny)
    y = z + (p @ v).transpose(1, 2).reshape(B, T, D) @ wo.T
    hidden = ln(y) @ w1.T + b1
    gelu = .5 * hidden * (1 + torch.erf(hidden / math.sqrt(2)))
    return y + gelu @ w2.T + b2

def reference(z):
    norm = F.layer_norm(z, (D,), gamma, beta, eps=1e-5)
    q, k, v = [split(F.linear(norm, w)) for w in (wq, wk, wv)]
    attn = F.scaled_dot_product_attention(q, k, v, attn_mask=allowed, dropout_p=0.)
    y = z + F.linear(attn.transpose(1, 2).reshape(B, T, D), wo)
    norm2 = F.layer_norm(y, (D,), gamma, beta, eps=1e-5)
    return y + F.linear(F.gelu(F.linear(norm2, w1, b1), approximate='none'), w2, b2)

torch.testing.assert_close(block(x), reference(x), rtol=1e-9, atol=1e-10)
changed = x.clone()
changed[:, 3, 0] += 100  # nonuniform change survives LayerNorm
torch.testing.assert_close(block(changed)[:, :3], block(x)[:, :3], rtol=1e-9, atol=1e-10)
print('decoder same-parameter numerical comparison and causality: OK')
```

## 边界条件与验证方法

常数输入的 LayerNorm 不应产生 NaN，零残差分支必须保持输入，错误分支形状必须被拒绝。训练题还覆盖全 key padding：attention 为零，但 FFN 与残差仍然工作，不能把整个 block 错误地清零。

组合模块的测试需要分层。先独立验证 LayerNorm/RMSNorm、FFN、MHA，再用不同原语构造整体基准；最后通过修改未来 token、修改 padding key、拆分组件等方式测试行为。否则两个相同错误的 helper 可能互相“验证通过”。

计算成本主要是投影 `O(BTD²)`、注意力 `O(BT²D)` 和 FFN `O(BTDF)`。这个最小示例没有 fused kernel 和激活缓存优化；它的用途是理解数据流和检查正确性，不能用演示脚本速度推断生产实现的吞吐。

## 面试自检

1. LayerNorm 为什么用 D 而不是 D-1？它是每个输入向量的规范化统计，使用总体方差定义，不是在估计总体方差的无偏样本量。
2. FFN 会让 token 0 直接读取 token 3 吗？不会，token 交互来自 attention。
3. Pre-Norm 写成 Post-Norm 后还能通过吗？shape 可能一样，数值和梯度路径都改变，必须通过独立数值基准区分。
4. 为什么 block 还不能生成文本？还缺词嵌入/位置处理、堆叠、输出词表概率与生成流程等模型级组件。

## 对应训练与继续阅读

依次完成 [LayerNorm / RMSNorm](/coding/torch-norm?track=pytorch)、[FFN 与精确 GELU](/coding/torch-ffn?track=pytorch)、[Pre-Norm 残差](/coding/torch-residual?track=pytorch) 和 [最小 Decoder Block](/coding/torch-decoder?track=pytorch)。

下一单元：[GQA 与 KV Cache](/library/career-gqa-kv-cache)，重点是复用历史计算时保持全量与增量输出一致。
