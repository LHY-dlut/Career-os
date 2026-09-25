# Career OS original teaching implementation. 本站原创教学补充；本轮未另行指定再分发许可。第三方已有许可不变。
# CPU exercises; no model weights, network calls, or GPU required.
import math
import torch

def ffn(x, w1, b1, w2, b2):
    """Positionwise D->F->D with exact GELU and [out,in] linear weights."""
    if x.ndim < 2 or w1.ndim != 2 or w2.ndim != 2:
        raise ValueError("invalid input/weight ranks")
    d, hidden = x.shape[-1], w1.shape[0]
    if w1.shape[1] != d or w2.shape != (d, hidden) or b1.shape != (hidden,) or b2.shape != (d,):
        raise ValueError("incompatible FFN shapes")
    z = x @ w1.T + b1
    activated = 0.5 * z * (1 + torch.erf(z / math.sqrt(2)))
    return activated @ w2.T + b2
