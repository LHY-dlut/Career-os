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

    def test_against_torch_mha_with_identical_parameters_masks_and_zero_dropout(self):
        x=rand(2,4,8); weights=[rand(8,8)*0.2 for _ in range(4)]
        model=torch.nn.MultiheadAttention(8,2,bias=False,dropout=0.0,batch_first=True,dtype=torch.float64)
        with torch.no_grad():
            model.in_proj_weight.copy_(torch.cat(weights[:3])); model.out_proj.weight.copy_(weights[3])
        model.eval()
        causal=torch.ones(4,4,dtype=torch.bool).tril()
        valid=torch.tensor([[True]*4,[True,True,False,False]])
        expected,_=model(x,x,x,attn_mask=~causal,key_padding_mask=~valid,need_weights=False)
        allowed=causal[None,None]&valid[:,None,None,:]
        close(solution.multi_head_attention(x,*weights,2,allowed),expected)

    def test_future_and_fully_masked_behavior(self):
        x=rand(1,4,8); weights=[rand(8,8)*0.2 for _ in range(4)]
        mask=torch.ones(4,4,dtype=torch.bool).tril()
        actual=solution.multi_head_attention(x,*weights,2,mask)
        changed=x.clone(); changed[:,3]+=50
        close(solution.multi_head_attention(changed,*weights,2,mask)[:,:3],actual[:,:3])
        close(solution.multi_head_attention(x,*weights,2,torch.zeros_like(mask)),torch.zeros_like(x))

    def test_invalid_heads_and_weights(self):
        x=rand(1,3,8); weights=[rand(8,8) for _ in range(4)]
        with self.assertRaises(ValueError): solution.multi_head_attention(x,*weights,3)
        weights[0]=rand(7,8)
        with self.assertRaises(ValueError): solution.multi_head_attention(x,*weights,2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
