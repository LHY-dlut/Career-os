# Career OS original CPU tests. 本站原创教学补充；本轮未另行指定再分发许可。第三方已有许可不变。
# Save your implementation as solution.py in this directory; run python -m unittest -v.
import math
import unittest
import torch
import torch.nn.functional as F
import solution

torch.set_num_threads(1)

def close(actual, expected):
    torch.testing.assert_close(actual, expected, rtol=1e-9, atol=1e-10)

def rand(*shape):
    return torch.randn(*shape, dtype=torch.float64)

class SolutionTests(unittest.TestCase):
    def setUp(self):
        torch.manual_seed(1234)

    def test_against_expanded_sdpa_for_mqa_gqa_and_mha(self):
        for kv_heads in (1,2,4):
            q,k,v=rand(2,4,3,6),rand(2,kv_heads,5,6),rand(2,kv_heads,5,7)
            mask=torch.ones(3,5,dtype=torch.bool); mask[:,4]=False
            expected=F.scaled_dot_product_attention(q,k.repeat_interleave(4//kv_heads,1),v.repeat_interleave(4//kv_heads,1),attn_mask=mask,dropout_p=0.0)
            close(solution.grouped_query_attention(q,k,v,mask),expected)

    def test_contiguous_query_groups_use_the_correct_kv_head(self):
        q=torch.zeros(1,4,2,2,dtype=torch.float64)
        k=torch.zeros(1,2,3,2,dtype=torch.float64)
        v=torch.tensor([[[[1.],[2.],[3.]],[[10.],[20.],[30.]]]],dtype=torch.float64)
        result=solution.grouped_query_attention(q,k,v)
        close(result,torch.tensor([[[[2.],[2.]],[[2.],[2.]],[[20.],[20.]],[[20.],[20.]]]],dtype=q.dtype))

    def test_all_masked_and_invalid_head_counts(self):
        q,k,v=rand(1,4,3,2),rand(1,2,3,2),rand(1,2,3,2)
        close(solution.grouped_query_attention(q,k,v,torch.zeros(3,3,dtype=torch.bool)),torch.zeros_like(q))
        with self.assertRaises(ValueError): solution.grouped_query_attention(q[:,:3],k,v)
        with self.assertRaises(ValueError): solution.grouped_query_attention(q,k,v[:,:1])


if __name__ == "__main__":
    unittest.main(verbosity=2)
