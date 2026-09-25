# Career OS original teaching implementation. 本站原创教学补充；本轮未另行指定再分发许可。第三方已有许可不变。
# CPU exercises; no model weights, network calls, or GPU required.
import math
import torch

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
