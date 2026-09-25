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

    def test_against_sdpa_without_dropout(self):
        q,k,v=rand(2,3,4,5),rand(2,3,6,5),rand(2,3,6,7)
        close(solution.scaled_attention(q,k,v),F.scaled_dot_product_attention(q,k,v,dropout_p=0.0))

    def test_causal_padding_broadcast_and_future_invariance(self):
        q,k,v=rand(2,2,4,4),rand(2,2,4,4),rand(2,2,4,3)
        valid=torch.tensor([[True,True,True,True],[True,True,False,False]])
        allowed=torch.ones(4,4,dtype=torch.bool).tril()[None,None]&valid[:,None,None,:]
        expected=F.scaled_dot_product_attention(q,k,v,attn_mask=allowed,dropout_p=0.0)
        close(solution.scaled_attention(q,k,v,allowed),expected)
        changed=v.clone(); changed[:,:,3,:]+=10000
        close(solution.scaled_attention(q,k,changed,allowed)[:,:,:3],expected[:,:,:3])

    def test_all_masked_is_zero_not_nan(self):
        q,k,v=rand(1,2,3,4),rand(1,2,5,4),rand(1,2,5,6)
        output=solution.scaled_attention(q,k,v,torch.zeros(3,5,dtype=torch.bool))
        close(output,torch.zeros(1,2,3,6,dtype=q.dtype))

    def test_gradients_and_invalid_shape(self):
        q,k,v=[rand(1,1,2,2).requires_grad_() for _ in range(3)]
        self.assertTrue(torch.autograd.gradcheck(solution.scaled_attention,(q,k,v),fast_mode=True))
        with self.assertRaises(ValueError): solution.scaled_attention(q,k[...,:1],v)
        with self.assertRaises(ValueError): solution.scaled_attention(q,k,v,torch.ones(2,2))
        with self.assertRaises(ValueError): solution.scaled_attention(q,k,v,torch.ones(5,5,dtype=torch.bool))


if __name__ == "__main__":
    unittest.main(verbosity=2)
