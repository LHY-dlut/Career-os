# Career OS original teaching implementation. 本站原创教学补充；本轮未另行指定再分发许可。第三方已有许可不变。
# CPU exercises; no model weights, network calls, or GPU required.
import math
import torch

def embedding_lookup(token_ids, weight, padding_idx=None):
    """Integer IDs [B,T], weight[V,D] -> [B,T,D]; optional padding outputs zero."""
    if token_ids.ndim != 2 or token_ids.dtype not in (torch.int32, torch.int64) or weight.ndim != 2:
        raise ValueError("expected integer IDs[B,T] and weight[V,D]")
    if not weight.is_floating_point() or token_ids.device != weight.device:
        raise ValueError("weight must be floating and on the IDs device")
    if token_ids.numel() and (token_ids.min() < 0 or token_ids.max() >= weight.shape[0]):
        raise ValueError("token ID outside vocabulary")
    if padding_idx is not None and (not isinstance(padding_idx, int) or not 0 <= padding_idx < weight.shape[0]):
        raise ValueError("invalid padding index")
    result = weight[token_ids.long()]
    if padding_idx is not None:
        result = result.masked_fill((token_ids == padding_idx).unsqueeze(-1), 0)
    return result
