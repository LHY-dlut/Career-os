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

def multi_head_attention(x, wq, wk, wv, wo, num_heads, allowed=None):
    """Bias-free self-attention; each weight is [D_out,D_in]=[D,D], dropout=0."""
    q = split_heads(x, num_heads)
    d = x.shape[-1]
    if any(w.shape != (d, d) for w in (wq, wk, wv, wo)):
        raise ValueError("projection weights must have shape [D,D]")
    q = split_heads(x @ wq.T, num_heads)
    k = split_heads(x @ wk.T, num_heads)
    v = split_heads(x @ wv.T, num_heads)
    return merge_heads(scaled_attention(q, k, v, allowed)) @ wo.T

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

def decoder_block(x, params, num_heads, key_valid=None):
    """One pre-LayerNorm decoder block, exact GELU, no dropout and no positional encoding."""
    if x.ndim != 3:
        raise ValueError("expected x[B,T,D]")
    b, t, _ = x.shape
    if key_valid is None:
        key_valid = torch.ones(b, t, dtype=torch.bool, device=x.device)
    if key_valid.shape != (b, t):
        raise ValueError("key_valid must have shape [B,T]")
    mask = make_allowed_mask(t, t, key_valid)
    normalized = layer_norm(x, params['n1w'], params['n1b'])
    attended = multi_head_attention(normalized, params['wq'], params['wk'], params['wv'], params['wo'], num_heads, mask)
    residual = x + attended
    normalized = layer_norm(residual, params['n2w'], params['n2b'])
    return residual + ffn(normalized, params['w1'], params['b1'], params['w2'], params['b2'])
