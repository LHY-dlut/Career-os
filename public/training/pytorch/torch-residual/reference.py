# Career OS original teaching implementation. 本站原创教学补充；本轮未另行指定再分发许可。第三方已有许可不变。
# CPU exercises; no model weights, network calls, or GPU required.
import math
import torch

def _norm_input(x, weight, eps):
    if x.ndim == 0 or x.shape[-1] == 0 or weight.shape != (x.shape[-1],) or eps <= 0:
        raise ValueError("expected [...,D], weight[D] and eps > 0")
    if not x.is_floating_point():
        raise ValueError("floating input required")
    return x.float() if x.dtype in (torch.float16, torch.bfloat16) else x


def layer_norm(x, weight, bias, eps=1e-5):
    work = _norm_input(x, weight, eps)
    if bias.shape != weight.shape:
        raise ValueError("bias must have shape [D]")
    centered = work - work.mean(dim=-1, keepdim=True)
    variance = centered.square().mean(dim=-1, keepdim=True)
    normalized = centered * torch.rsqrt(variance + eps)
    return (normalized * weight + bias).to(x.dtype)


def rms_norm(x, weight, eps=1e-5):
    work = _norm_input(x, weight, eps)
    normalized = work * torch.rsqrt(work.square().mean(dim=-1, keepdim=True) + eps)
    return (normalized * weight).to(x.dtype)

def pre_norm_residual(x, weight, bias, transform, eps=1e-5):
    branch = transform(layer_norm(x, weight, bias, eps))
    if branch.shape != x.shape:
        raise ValueError("residual branch must preserve shape")
    return x + branch
