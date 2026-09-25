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

    def test_against_linear_gelu_reference(self):
        x=rand(2,3,4); w1,b1,w2,b2=rand(7,4),rand(7),rand(4,7),rand(4)
        expected=F.linear(F.gelu(F.linear(x,w1,b1),approximate='none'),w2,b2)
        close(solution.ffn(x,w1,b1,w2,b2),expected)

    def test_positionwise_property_and_gradients(self):
        x=rand(2,3,4).requires_grad_(); weights=rand(5,4),rand(5),rand(4,5),rand(4)
        result=solution.ffn(x,*weights)
        changed=x.detach().clone(); changed[:,2]+=5
        close(solution.ffn(changed,*weights)[:,:2],result[:,:2])
        result.sum().backward(); self.assertTrue(torch.isfinite(x.grad).all()); self.assertGreater(x.grad.abs().sum().item(),0)

    def test_bad_weight_shape(self):
        with self.assertRaises(ValueError): solution.ffn(rand(2,3,4),rand(5,4),rand(5),rand(4,6),rand(4))


if __name__ == "__main__":
    unittest.main(verbosity=2)
