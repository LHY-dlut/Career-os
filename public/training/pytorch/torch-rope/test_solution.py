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

    def test_against_independent_complex_rotation(self):
        x=rand(2,3,5,8); offset=7
        complex_x=torch.view_as_complex(x.reshape(2,3,5,4,2).contiguous())
        angles=torch.arange(offset,offset+5,dtype=x.dtype)[:,None]*10000**(-torch.arange(0,8,2,dtype=x.dtype)/8)
        expected=torch.view_as_real(complex_x*torch.polar(torch.ones_like(angles),angles)).flatten(-2)
        close(solution.apply_rope(x,offset),expected)

    def test_norm_offset_and_relative_position(self):
        x=rand(1,2,6,8)
        close(solution.apply_rope(x).square().sum(-1),x.square().sum(-1))
        close(solution.apply_rope(x[:,:,3:],offset=3),solution.apply_rope(x)[:,:,3:])
        q,k=rand(1,2,1,8),rand(1,2,1,8)
        first=(solution.apply_rope(q,3)*solution.apply_rope(k,7)).sum(-1)
        shifted=(solution.apply_rope(q,8)*solution.apply_rope(k,12)).sum(-1)
        close(first,shifted)

    def test_invalid_layout_or_offset(self):
        with self.assertRaises(ValueError): solution.apply_rope(rand(1,2,3,5))
        with self.assertRaises(ValueError): solution.apply_rope(rand(1,2,3,4),-1)
        with self.assertRaises(ValueError): solution.apply_rope(rand(2,3,4))


if __name__ == "__main__":
    unittest.main(verbosity=2)
