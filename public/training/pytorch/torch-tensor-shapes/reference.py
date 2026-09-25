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
