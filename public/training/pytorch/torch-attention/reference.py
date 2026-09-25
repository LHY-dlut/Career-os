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

def scaled_attention(q, k, v, allowed=None):
    """Q:[B,H,Q,D], K:[B,H,K,D], V:[B,H,K,Dv]; True means visible."""
    if q.ndim != 4 or k.ndim != 4 or v.ndim != 4:
        raise ValueError("Q, K, V must be rank four")
    if q.shape[:2] != k.shape[:2] or k.shape[:3] != v.shape[:3] or q.shape[-1] != k.shape[-1]:
        raise ValueError("incompatible Q/K/V shapes")
    if min(q.shape[-2:]) <= 0 or min(k.shape[-2:]) <= 0 or v.shape[-1] <= 0:
        raise ValueError("empty sequence/features are unsupported")
    if not q.is_floating_point() or q.dtype != k.dtype or k.dtype != v.dtype:
        raise ValueError("Q/K/V need the same floating dtype")
    if q.device != k.device or k.device != v.device:
        raise ValueError("Q/K/V need the same device")
    if not all(torch.isfinite(tensor).all() for tensor in (q, k, v)):
        raise ValueError("Q/K/V must be finite")
    scores = (q @ k.transpose(-2, -1)) / math.sqrt(q.shape[-1])
    if allowed is not None:
        if allowed.dtype != torch.bool or allowed.device != q.device:
            raise ValueError("allowed must be a same-device boolean tensor")
        try:
            visible = torch.broadcast_to(allowed, scores.shape)
        except RuntimeError as exc:
            raise ValueError("mask cannot broadcast to [B,H,Q,K]") from exc
        scores = scores.masked_fill(~visible, -torch.inf)
    return stable_softmax(scores) @ v
