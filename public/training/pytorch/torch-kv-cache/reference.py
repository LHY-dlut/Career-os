# Career OS original teaching implementation. 本站原创教学补充；本轮未另行指定再分发许可。第三方已有许可不变。
# CPU exercises; no model weights, network calls, or GPU required.
import math
import torch

def split_heads(x, num_heads):
    """[B,T,D] -> [B,H,T,D/H], including non-contiguous inputs."""
    if x.ndim != 3 or not isinstance(num_heads, int) or num_heads <= 0:
        raise ValueError("expected [B,T,D] and positive integer heads")
    b, t, d = x.shape
    if d == 0 or d % num_heads:
        raise ValueError("D must be positive and divisible by H")
    return x.reshape(b, t, num_heads, d // num_heads).transpose(1, 2)


def merge_heads(x):
    if x.ndim != 4:
        raise ValueError("expected [B,H,T,d]")
    b, h, t, d = x.shape
    return x.transpose(1, 2).reshape(b, t, h * d)


def batched_scores(q, k):
    if q.ndim != 4 or k.ndim != 4 or q.shape[:2] != k.shape[:2] or q.shape[-1] != k.shape[-1]:
        raise ValueError("Q/K batch, heads and feature dimensions must match")
    return q @ k.transpose(-2, -1)

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

def make_allowed_mask(query_length, key_length, key_valid, query_offset=0):
    """Return [B,1,Q,K]. key_valid:[B,K], True=real key; causal absolute positions."""
    if any(not isinstance(n, int) for n in (query_length, key_length, query_offset)):
        raise ValueError("lengths/offset must be integers")
    if query_length <= 0 or key_length <= 0 or query_offset < 0 or query_offset + query_length > key_length:
        raise ValueError("invalid lengths or query offset")
    if key_valid.dtype != torch.bool or key_valid.ndim != 2 or key_valid.shape[1] != key_length:
        raise ValueError("key_valid must be boolean [B,K]")
    q_positions = torch.arange(query_offset, query_offset + query_length, device=key_valid.device)
    k_positions = torch.arange(key_length, device=key_valid.device)
    causal = k_positions[None, :] <= q_positions[:, None]
    return causal[None, None, :, :] & key_valid[:, None, None, :]

def apply_rope(x, offset=0, base=10000.0):
    """Adjacent even/odd pairs in [B,H,T,D]; absolute positions offset..offset+T-1."""
    if x.ndim != 4 or x.shape[-1] <= 0 or x.shape[-1] % 2:
        raise ValueError("RoPE expects [B,H,T,D] with positive even D")
    if not x.is_floating_point() or not isinstance(offset, int) or offset < 0 or base <= 0:
        raise ValueError("floating x, nonnegative integer offset and positive base required")
    work_dtype = torch.float64 if x.dtype == torch.float64 else torch.float32
    frequencies = base ** (-torch.arange(0, x.shape[-1], 2, device=x.device, dtype=work_dtype) / x.shape[-1])
    positions = torch.arange(offset, offset + x.shape[-2], device=x.device, dtype=work_dtype)
    angles = positions[:, None] * frequencies[None, :]
    cosine, sine = angles.cos(), angles.sin()
    even, odd = x[..., 0::2], x[..., 1::2]
    rotated = torch.stack((even * cosine - odd * sine, even * sine + odd * cosine), dim=-1)
    return rotated.flatten(-2).to(x.dtype)

def cached_attention(x, wq, wk, wv, wo, num_heads, cache=None, key_valid=None):
    """RoPE self-attention. cache=(rotated K,V), each [B,H,past,D/H]; returns output,new_cache."""
    split_heads(x, num_heads)
    b, t, d = x.shape
    if t <= 0 or any(w.shape != (d, d) for w in (wq, wk, wv, wo)):
        raise ValueError("nonempty x and [D,D] projection weights required")
    past = 0
    if cache is not None:
        if not isinstance(cache, tuple) or len(cache) != 2:
            raise ValueError("cache must be a (K,V) tuple")
        old_k, old_v = cache
        expected = (b, num_heads)
        if old_k.ndim != 4 or old_k.shape != old_v.shape or old_k.shape[:2] != expected or old_k.shape[-1] != d // num_heads:
            raise ValueError("incompatible cache shape")
        if old_k.device != x.device or old_v.device != x.device or old_k.dtype != x.dtype or old_v.dtype != x.dtype:
            raise ValueError("cache dtype/device mismatch")
        past = old_k.shape[-2]
    q = apply_rope(split_heads(x @ wq.T, num_heads), offset=past)
    k = apply_rope(split_heads(x @ wk.T, num_heads), offset=past)
    v = split_heads(x @ wv.T, num_heads)
    if cache is not None:
        k = torch.cat((cache[0], k), dim=-2)
        v = torch.cat((cache[1], v), dim=-2)
    if key_valid is None:
        key_valid = torch.ones(b, past + t, dtype=torch.bool, device=x.device)
    if key_valid.shape != (b, past + t):
        raise ValueError("key_valid must include both cached and new keys")
    mask = make_allowed_mask(t, past + t, key_valid, query_offset=past)
    output = merge_heads(scaled_attention(q, k, v, mask)) @ wo.T
    return output, (k, v)
