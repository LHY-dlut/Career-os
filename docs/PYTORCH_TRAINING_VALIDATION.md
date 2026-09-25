# PyTorch 训练与原创教材验证

验证日期：2026-09-25。此文记录实际执行结果；未将浏览器中的“自评完成”当作自动判题结果。

## 交付范围

- `src/content/training/pytorch.json`：14 项完整训练，按约定顺序包含描述、输入输出、例子、提示、未完成代码骨架、复杂度、易错点、面试自检、相关教材 ID，以及独立参考/测试路径。
- `public/training/pytorch/<task-id>/reference.py` 与 `test_solution.py`：14 对独立下载文件。测试统一 `import solution`，学习者代码文件名为 `solution.py`。
- `public/library/career-*.md`：6 篇完整原创教学单元，另有独立来源与许可状态说明；本站原创教学补充，本轮未另行指定再分发许可，不改写上游文章或 provenance。
- `src/content/library/supplemental-catalog.json`、`supplemental-sources.json`：原创来源、内容状态、六个稳定教材 ID 与对应训练 IDs。
- `public/training/pytorch/validate_references.py`：可复现的维护者检查入口，不是用户草稿的在线判题服务。

## 实际环境与结果

| 项目 | 实测值 |
| --- | --- |
| 系统 | Windows，CPU 执行 |
| Python | 3.12.14（由 bundled Python 创建项目局部 venv） |
| PyTorch | `2.14.0+cpu`，来自官方 CPU wheel index |
| 环境位置 | `.tools/pytorch-training`，被 git 忽略 |
| CUDA | `torch.cuda.is_available() == False` |
| 随机种子 / 线程 | 训练测试每例 `torch.manual_seed(1234)`；`torch.set_num_threads(1)` |
| 常规数值容差 | float64 `rtol=1e-9, atol=1e-10`；float16 用测试中显式放宽的容差 |
| 参考答案 | **14 包、49 个 unittest 全部通过** |
| 空骨架检查 | **14 个骨架全部被拒绝，错误包含 NotImplementedError** |
| 故意错误变体 | **5 个变体被真实数值/行为断言拒绝** |
| 教材代码 | **6 篇共 6 个独立 Python 示例全部运行通过** |
| 外部依赖 | 不下载权重、不调用网络/API、不需要 GPU；测试框架为 Python 标准库 unittest |

该 venv 没有安装 NumPy。PyTorch 导入时会发出 `Failed to initialize NumPy: No module named 'numpy'` 提示；本训练没有使用 NumPy 互操作，以上数值测试与教程示例仍全部成功。未修改全局 Python 或全局包。

## 按任务列出的数值与行为覆盖

| 任务 ID | 测试数 | 关键验证 |
| --- | ---: | --- |
| torch-tensor-shapes | 4 | 显式元素分头顺序、合头还原、非连续输入、einsum 对照、非法维度 |
| torch-softmax | 4 | 大正负值、平移不变、归一化轴、部分/全遮蔽、有限梯度、半精度、非法值/轴 |
| torch-embedding | 4 | 查表数值、padding 零输出与零梯度、重复 ID 梯度累积、int32、空序列、非法 ID |
| torch-attention | 4 | 相同 Q/K/V 的 SDPA 对照、不同 dv、causal+padding、未来扰动、全遮蔽零输出、gradcheck、错误 mask |
| torch-masks | 4 | 明确布尔期望值、非零 query offset、全 padding、长度/offset/type 错误 |
| torch-mha | 3 | 同权重 nn.MultiheadAttention 对照，mask 语义转换、dropout=0、未来扰动、全遮蔽、非法头数/权重 |
| torch-norm | 4 | F.layer_norm/F.rms_norm 对照、总体方差、平移差异、常数输入、两者 gradcheck、错误 shape/eps |
| torch-ffn | 3 | F.linear + 精确 F.gelu 对照、token 位置独立性、非零有限梯度、权重形状 |
| torch-residual | 3 | Pre-Norm 次序、零分支恒等与梯度 1、拒绝分支广播 |
| torch-sinusoidal | 3 | 独立 math.sin/cos 标量基准、offset 切片、空长度、奇数维与类型错误 |
| torch-rope | 3 | 独立复数乘法基准、范数保持、非零 offset 切片、共同平移点积不变、非法配对 |
| torch-decoder | 4 | 独立 PyTorch 原语组合对照、causal+padding、未来/padding 扰动、全遮蔽分支、非法输入 |
| torch-kv-cache | 3 | 含独立复数 RoPE 的全量基准；逐 token、[2,1,4]、[3,4] 分块一致；缓存 shape 与旧缓存不变；padding、全遮蔽、非法 cache |
| torch-gqa | 3 | Hkv=1/2/4 的展开 KV SDPA 对照、显式连续分组值 2/20、不同 dv、mask、全遮蔽、非法头数 |

数值基准与参考实现分离：参考 attention 不调用 SDPA/MHA，参考归一化不调用高层 norm，FFN 显式使用 erf，RoPE 手写实数二维旋转。测试使用 SDPA/MHA/归一化函数或独立复数/标量公式对照，不只检查 shape、非空或运行成功。

## 统一契约与边界

1. `allowed=True` 表示可见；`key_valid=True` 表示真实 key。MHA 对照接口的屏蔽 mask 需要反向转换。
2. 注意力全遮蔽行输出零，不产生 NaN。普通未扩展 softmax 对全 `-inf` 行未定义；这里的零行为是训练明确约定。
3. causal 与 padding 用逻辑与合并。query 的绝对位置是 `query_offset + i`；padding key 不代表最终 padding query 的残差会自动归零。
4. Q/K/V 形状、head 数、mask 布尔类型/广播范围、cache shape/dtype/device、RoPE 偶数维和 offset 均有针对性检查。
5. RoPE 采用相邻偶数/奇数维配对；cache 中保存已旋转的旧 K，旧 K 不重复旋转。测试对照关闭 dropout。
6. GQA 必须 `Hq % Hkv == 0` 且 K/V 头数一致，按连续 query 头分组。教学版会显式 repeat_interleave，以正确性为目标，不冒称优化 kernel 的性能。
7. Decoder 练习是零 dropout、bias-free attention、pre-norm、精确 GELU 的最小 block；不含位置编码/词表头。KV 练习是带 RoPE 的单层 attention cache，不冒称完整语言模型。

## 防止“空实现也通过”的反向验证

所有 14 个 JSON 骨架只有接口、导入和 `raise NotImplementedError`，没有答案。每个骨架实际装入同一套测试，均无法通过。

另将正确参考实现分别修改成以下错误版本，确认每项都触发 `unittest` 的数值/行为 `AssertionError`，不是单纯导入失败：

- attention 将 `masked_fill(~visible, -inf)` 改为 `masked_fill(visible, -inf)`。
- RoPE 忽略 offset，从位置 0 重新开始。
- KV cache 将 causal query offset 固定为 0。
- KV cache 将新 Q/K 的 RoPE offset 固定为 0。
- GQA 将连续 `repeat_interleave` 改为错误顺序的 `repeat`。

这些检查证明测试能识别几类关键回归；不宣称有限测试能证明任意实现绝对正确。

## 复现方法

使用项目局部环境，不安装到全局 Python。安装依赖只在准备环境时需要网络；测试运行不需要网络。

```powershell
python -m venv .tools/pytorch-training
.\.tools\pytorch-training\Scripts\python.exe -m pip install -r public/training/pytorch/requirements.txt
.\.tools\pytorch-training\Scripts\python.exe -X utf8 public/training/pytorch/validate_references.py --negative-checks --tutorial-checks
```

固定 CPU 依赖文件为 `torch==2.14.0+cpu`，index 为 `https://download.pytorch.org/whl/cpu`。Python 版本/平台需有对应 wheel。上面最后一条命令验证仓库参考答案、未完成骨架、错误变体和六篇实际 Markdown 中的代码块；失败会以非零退出码结束。

学习者只验证自己的某一道题时：将页面下载的代码保存为 `solution.py`，与该题 `test_solution.py` 放在同一目录，然后运行：

```powershell
python -m unittest -v test_solution
```

参考答案文件名是 `reference.py`，测试默认不会偷偷导入它。维护者曾在忽略的 `output/pytorch-validation/<id>/` 中复制 reference 为 solution 并逐包执行，之后用维护者入口复现全部结果。`output/` 和 `.tools/` 不应提交。

## 教材与一手来源核验

六篇正文均包含学习目标/先修、原创解释、公式与符号、shape 流转、CPU 可运行代码、边界条件、面试自检、canonical 训练链接与一手参考。每篇独立标明原创作者、来源与许可状态：本站原创教学补充；本轮未另行指定再分发许可。上游教程原文、来源及第三方已有许可不变。

- [PyTorch 广播规则](https://docs.pytorch.org/docs/2.14/notes/broadcasting.html) 与 [reshape](https://docs.pytorch.org/docs/2.14/generated/torch.Tensor.reshape.html)：广播轴匹配、视图与必要复制。
- [Embedding](https://docs.pytorch.org/docs/2.14/generated/torch.nn.functional.embedding.html)：查表与 padding 梯度语义；本练习明确增加零输出策略。
- [SDPA](https://docs.pytorch.org/docs/2.14/generated/torch.nn.functional.scaled_dot_product_attention.html)：mask True 含义、显式关闭 dropout、GQA 头数约束。
- [LayerNorm](https://docs.pytorch.org/docs/2.14/generated/torch.nn.LayerNorm.html)、[RMSNorm](https://docs.pytorch.org/docs/2.14/generated/torch.nn.RMSNorm.html)、[GELU](https://docs.pytorch.org/docs/2.14/generated/torch.nn.functional.gelu.html)：总体方差、RMS 统计、精确 erf 公式。
- [Attention Is All You Need](https://arxiv.org/abs/1706.03762)：attention、MHA、正弦位置编码；区分论文 Post-Norm 示意与本训练 Pre-Norm 选择。
- [On Layer Normalization in the Transformer Architecture](https://arxiv.org/abs/2002.04745)：归一化位置与结构区分。
- [RoFormer](https://arxiv.org/abs/2104.09864)：旋转位置编码与相对位置结构，不将其误写成任意点积随距离单调衰减。
- [GQA](https://arxiv.org/abs/2305.13245)：query 头共享 KV 组。
- [Hugging Face 缓存说明](https://huggingface.co/docs/transformers/main/cache_explanation)：逐层 K/V 追加与增量注意力的数据流。

未进行 GPU 性能测试、训练收敛实验、模型质量评估或在线任意代码执行。页面编辑/下载/自评与此 CPU 本地数值验证是不同功能，不能把用户自评显示成自动判题通过。
