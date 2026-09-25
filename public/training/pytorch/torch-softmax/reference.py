# Career OS original teaching implementation. 本站原创教学补充；本轮未另行指定再分发许可。第三方已有许可不变。
# CPU exercises; no model weights, network calls, or GPU required.
import math
import torch

def stable_softmax(x, dim=-1):
    """Normalize finite/-inf scores; an all--inf row is exactly zero."""
    if not x.is_floating_point() or x.ndim == 0 or not -x.ndim <= dim < x.ndim:
        raise ValueError("expected floating tensor and valid dimension")
    if x.shape[dim] == 0 or torch.isnan(x).any() or torch.isposinf(x).any():
        raise ValueError("empty axes, NaN and +inf are unsupported")
    work = x.float() if x.dtype in (torch.float16, torch.bfloat16) else x
    maximum = work.amax(dim=dim, keepdim=True)
    maximum = torch.where(torch.isfinite(maximum), maximum, torch.zeros_like(maximum))
    numerator = torch.exp(work - maximum)
    denominator = numerator.sum(dim=dim, keepdim=True)
    return (numerator / denominator.clamp_min(torch.finfo(work.dtype).tiny)).to(x.dtype)
