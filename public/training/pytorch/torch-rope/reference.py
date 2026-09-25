# Career OS original teaching implementation. 本站原创教学补充；本轮未另行指定再分发许可。第三方已有许可不变。
# CPU exercises; no model weights, network calls, or GPU required.
import math
import torch

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
