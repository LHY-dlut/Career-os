# Career OS original teaching implementation. 本站原创教学补充；本轮未另行指定再分发许可。第三方已有许可不变。
# CPU exercises; no model weights, network calls, or GPU required.
import math
import torch

def sinusoidal_encoding(length, dim, offset=0, base=10000.0, dtype=torch.float32):
    """CPU [length,dim], even dimensions sine, odd dimensions cosine."""
    if not all(isinstance(n, int) for n in (length, dim, offset)) or length < 0 or dim <= 0 or dim % 2 or offset < 0 or base <= 0:
        raise ValueError("nonnegative length/offset and positive even dim required")
    if not dtype.is_floating_point:
        raise ValueError("floating dtype required")
    work_dtype = torch.float64 if dtype == torch.float64 else torch.float32
    positions = torch.arange(offset, offset + length, dtype=work_dtype)
    frequencies = base ** (-torch.arange(0, dim, 2, dtype=work_dtype) / dim)
    angles = positions[:, None] * frequencies[None, :]
    return torch.stack((angles.sin(), angles.cos()), dim=-1).flatten(-2).to(dtype)
