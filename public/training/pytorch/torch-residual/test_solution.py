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

    def test_pre_norm_order_and_residual(self):
        x=rand(2,3,4); w,b,m=rand(4),rand(4),rand(4,4)
        close(solution.pre_norm_residual(x,w,b,lambda z:z@m),x+F.layer_norm(x,(4,),w,b)@m)

    def test_zero_branch_preserves_input_and_identity_gradient(self):
        x=rand(1,2,4).requires_grad_(); w=torch.ones(4,dtype=x.dtype); b=torch.zeros_like(w)
        result=solution.pre_norm_residual(x,w,b,lambda z:z*0)
        close(result,x); result.sum().backward(); close(x.grad,torch.ones_like(x))

    def test_no_implicit_broadcast_in_residual(self):
        with self.assertRaises(ValueError): solution.pre_norm_residual(rand(2,3,4),rand(4),rand(4),lambda z:z.mean(1,keepdim=True))


if __name__ == "__main__":
    unittest.main(verbosity=2)
