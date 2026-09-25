# Tensor 形状：从词向量走到多头注意力

> Career OS 原创教学单元 · 作者：Career OS 项目贡献者 · 更新：2026-09-25。正文与示例均为本站独立编写，不是上游教程的翻译或署名转载。本站原创教学补充；本轮未另行指定再分发许可。[来源与许可说明](/library/career-LICENSE.md)。

## 学习目标与先修知识

完成本单元后，你应该能按元素索引解释 `[B,T,D]` 与 `[B,H,T,d]` 的转换，推导批量矩阵乘法输出形状，并检查广播是否符合业务语义。先掌握 Python 索引、二维矩阵乘法以及 `torch.Tensor` 的创建和 `shape`；暂时不需要训练完整模型。

我们用 `B` 表示 batch 大小，`T` 表示 token 数，`D` 表示模型维度，`H` 表示注意力头数，`d=D/H` 表示每头维度。形状是每个轴的含义约定，不只是能让代码通过的数字。例如两个长度都为 4 的轴也可能分别代表 token 和 head，交换以后不会报错，却改变了模型。

## 从 token ID 到连续向量

输入 token ID 是整数矩阵 `ids:[B,T]`。Embedding 权重 `E:[V,D]` 有 `V` 行，每行代表一个 token 的可学习向量；查表结果满足：

$$X_{b,t,j}=E_{\mathrm{ids}_{b,t},j},\qquad X\in\mathbb{R}^{B\times T\times D}.$$

查表可用 `E[ids]` 实现。它不需要先构造 `[B,T,V]` 的 one-hot；同一个 ID 出现多次时，反向传播会把对应位置的梯度加到同一行。整数 ID 本身不求梯度，权重是可学习的浮点 Tensor。训练中的 padding 题额外要求 padding 输出为零并屏蔽其梯度，不要把这条显式策略与任意初始化权重下的查表结果混为一谈。[PyTorch embedding 文档](https://docs.pytorch.org/docs/2.14/generated/torch.nn.functional.embedding.html)

## 分头不是重新解释 token 顺序

多头注意力把每个 token 的 `D` 维向量切成 `H` 段：

$$X^{\mathrm{head}}_{b,h,t,r}=X_{b,t,h\cdot d+r}.$$

所以正确步骤是先 `reshape(B,T,H,d)`，再 `transpose(1,2)`。如果直接 `reshape(B,H,T,d)`，Tensor 的元素总数虽然一样，却会把本来属于相邻 token 的数据塞进错误的头。

| 阶段 | 形状 | 含义 |
| --- | --- | --- |
| token 查表 | `[B,T,D]` | 每个 token 一个 D 维向量 |
| 拆最后一维 | `[B,T,H,d]` | 仍保持 token 连续顺序 |
| 交换轴 | `[B,H,T,d]` | 每个头有自己的 T 个向量 |
| 合头前交换回来 | `[B,T,H,d]` | 恢复 token 优先布局 |
| 合并最后两维 | `[B,T,D]` | 恢复模型维度 |

`transpose` 通常返回共享存储的视图，改变的是 stride。随后直接 `view` 可能因为内存不连续而失败；`reshape` 在能返回视图时返回视图，需要时会复制。不要把它当成“永远不分配内存”的接口。[reshape 文档](https://docs.pytorch.org/docs/2.14/generated/torch.Tensor.reshape.html)

## 批量矩阵乘法与广播

设 `Q:[B,H,Tq,d]`、`K:[B,H,Tk,d]`，最后两个轴按矩阵乘法计算：

$$S_{b,h,i,j}=\sum_{r=0}^{d-1}Q_{b,h,i,r}K_{b,h,j,r},\qquad S:[B,H,T_q,T_k].$$

代码是 `Q @ K.transpose(-2,-1)`。这里的 `@` 会尝试广播前面的轴，所以生产代码不能只依赖它检查业务约束：如果某个输入 batch 是 1，可能被悄悄广播成多个 batch。本训练题明确要求 batch/head 相同。

广播从最右边的轴向左匹配：长度相等或其中一个为 1 时可扩展。比如偏置 `[D]` 可以加到 `[B,T,D]`；key padding `[B,Tk]` 要用于注意力 `[B,H,Tq,Tk]` 时，应显式写成 `[B,1,1,Tk]`。仅仅能广播不代表轴对了，尤其 `B==Tq` 时错误布局可能难以察觉。[广播规则](https://docs.pytorch.org/docs/2.14/notes/broadcasting.html)

## 最小可运行示例

保存为 `tensor_shapes_demo.py`，在安装了 CPU PyTorch 的环境运行 `python tensor_shapes_demo.py`。示例不下载模型，断言同时验证形状和元素对应。

```python
import torch

B, T, D, H = 2, 3, 8, 2
d = D // H
x = torch.arange(B * T * D, dtype=torch.float64).reshape(B, T, D)
heads = x.reshape(B, T, H, d).transpose(1, 2)
assert heads.shape == (B, H, T, d)
assert heads[1, 1, 2, 0] == x[1, 2, 4]
restored = heads.transpose(1, 2).reshape(B, T, D)
torch.testing.assert_close(restored, x)

scores = heads @ heads.transpose(-2, -1)
expected = torch.einsum('bhid,bhjd->bhij', heads, heads)
torch.testing.assert_close(scores, expected)

key_valid = torch.tensor([[True, True, False], [True, False, True]])
visible = key_valid[:, None, None, :].expand(B, H, T, T)
assert visible.shape == scores.shape
assert not visible[0, 1, 2, 2]

table = torch.tensor([[1., 2.], [3., 4.], [5., 6.]], requires_grad=True)
ids = torch.tensor([[2, 0, 2]])
table[ids].sum().backward()
torch.testing.assert_close(table.grad[2], torch.tensor([2., 2.]))
print('shape, element order, broadcast, and embedding gradient: OK')
```

## 边界条件与排错顺序

先验证 rank 和轴语义，再检查 `D%H==0`，然后检查 dtype/device，最后看 stride。不要用 `reshape` 去“修好”本来错误的输入形状。遇到非连续输入时，应判断允许复制还是必须保持视图，并在接口中明确。

训练题允许 embedding 的 `T=0`，因为输出空序列是明确的；attention 题则拒绝空 key/query 轴，避免归一化空集合。是否允许空轴由算子契约决定，不要在不同函数中无意识地继承同一个规则。测试时使用不同的 B、H、T、d，有助于暴露碰巧相等维度掩盖的问题。

## 面试自检

1. 能否解释为什么直接 `reshape(B,H,T,d)` 错了？用 `X[b,t,h*d+r]` 给出元素对应，而不只说“顺序不同”。
2. `transpose` 为什么可能导致 `view` 报错？需要说出 stride 与连续性，并说明 `reshape` 可能复制。
3. 为什么 key padding 要变成 `[B,1,1,Tk]`？需要说出它对所有头、所有 query 共享，而每个 batch 的 key 有效性不同。
4. Embedding 的重复 ID 梯度是什么？应回答按出现位置求和，而非覆盖。

## 练习与下一步

先完成 [Tensor 形状与分头变换](/coding/torch-tensor-shapes?track=pytorch)，再完成 [Embedding 查表与 padding 梯度](/coding/torch-embedding?track=pytorch)。每题下载自己的 `solution.py` 与测试到同一文件夹后执行 `python -m unittest -v`；参考答案作为单独下载项按需查看。

接着阅读 [Scaled Dot-Product Attention](/library/career-scaled-attention)，把已经能解释的 `[B,H,Tq,Tk]` 变成真正的注意力权重。
