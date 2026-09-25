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


def rotate_oracle(x, offset=0):
    t,d=x.shape[-2:]
    angles=torch.arange(offset,offset+t,dtype=x.dtype)[:,None]*10000**(-torch.arange(0,d,2,dtype=x.dtype)/d)
    complex_x=torch.view_as_complex(x.reshape(*x.shape[:-1],d//2,2).contiguous())
    return torch.view_as_real(complex_x*torch.polar(torch.ones_like(angles),angles)).flatten(-2)

def full_cache_oracle(x,weights,h,valid):
    b,t,d=x.shape
    q,k,v=[F.linear(x,w).reshape(b,t,h,d//h).transpose(1,2) for w in weights[:3]]
    q,k=rotate_oracle(q),rotate_oracle(k)
    allowed=torch.ones(t,t,dtype=torch.bool).tril()[None,None]&valid[:,None,None,:]
    attended=F.scaled_dot_product_attention(q,k,v,attn_mask=allowed,dropout_p=0.0)
    return F.linear(attended.transpose(1,2).reshape(b,t,d),weights[3]),(k,v)

class SolutionTests(unittest.TestCase):
    def setUp(self):
        torch.manual_seed(1234)

    def test_full_against_independent_rope_sdpa_reference(self):
        x=rand(2,6,8); weights=[rand(8,8)*0.2 for _ in range(4)]
        valid=torch.tensor([[True]*6,[True,True,False,True,True,False]])
        actual,cache=solution.cached_attention(x,*weights,2,key_valid=valid)
        expected,expected_cache=full_cache_oracle(x,weights,2,valid)
        close(actual,expected); close(cache[0],expected_cache[0]); close(cache[1],expected_cache[1])

    def test_full_equals_single_token_and_multi_token_chunks_with_padding(self):
        x=rand(2,7,8); weights=[rand(8,8)*0.2 for _ in range(4)]
        valid=torch.tensor([[True]*7,[True,True,False,True,False,True,True]])
        expected,_=full_cache_oracle(x,weights,2,valid)
        for sizes in ([1]*7,[2,1,4],[3,4]):
            outputs=[]; cache=None; start=0
            for size in sizes:
                previous=None if cache is None else tuple(value.clone() for value in cache)
                old_cache=cache
                out,cache=solution.cached_attention(x[:,start:start+size],*weights,2,cache,valid[:,:start+size])
                if previous is not None:
                    close(old_cache[0],previous[0]); close(old_cache[1],previous[1])
                outputs.append(out); start+=size
                self.assertEqual(tuple(cache[0].shape),(2,2,start,4))
            close(torch.cat(outputs,dim=1),expected)

    def test_fully_masked_cache_and_shape_validation(self):
        x=rand(1,2,8); weights=[rand(8,8)*0.2 for _ in range(4)]
        actual,_=solution.cached_attention(x,*weights,2,key_valid=torch.zeros(1,2,dtype=torch.bool))
        close(actual,torch.zeros_like(x))
        with self.assertRaises(ValueError): solution.cached_attention(x,*weights,3)
        with self.assertRaises(ValueError): solution.cached_attention(x,*weights,2,(rand(1,3,2,4),rand(1,3,2,4)))
        _,cache=solution.cached_attention(x,*weights,2)
        with self.assertRaises(ValueError): solution.cached_attention(x,*weights,2,cache,torch.ones(1,2,dtype=torch.bool))
        with self.assertRaises(ValueError): solution.cached_attention(x,*weights,2,(cache[0].float(),cache[1].float()))


if __name__ == "__main__":
    unittest.main(verbosity=2)
