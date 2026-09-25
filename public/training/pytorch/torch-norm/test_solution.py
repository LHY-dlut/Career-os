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

    def test_layer_norm_against_torch_and_shift_invariance(self):
        x=rand(2,3,5); w,b=rand(5),rand(5)
        close(solution.layer_norm(x,w,b),F.layer_norm(x,(5,),w,b,1e-5))
        close(solution.layer_norm(x+100,w,b),solution.layer_norm(x,w,b))

    def test_rms_norm_against_torch_and_not_mean_centered(self):
        x=rand(2,3,5)+2; w=rand(5)
        close(solution.rms_norm(x,w),F.rms_norm(x,(5,),w,1e-5))
        result=solution.rms_norm(torch.ones(1,4,dtype=torch.float64),torch.ones(4,dtype=torch.float64))
        self.assertGreater(result.mean().item(),0.9)

    def test_constant_input_and_gradcheck(self):
        x=torch.ones(2,3,4,dtype=torch.float64)
        close(solution.layer_norm(x,torch.ones(4,dtype=x.dtype),torch.zeros(4,dtype=x.dtype)),torch.zeros_like(x))
        x=rand(1,2,3).requires_grad_(); w=rand(3).requires_grad_(); b=rand(3).requires_grad_()
        self.assertTrue(torch.autograd.gradcheck(solution.layer_norm,(x,w,b),fast_mode=True))
        self.assertTrue(torch.autograd.gradcheck(solution.rms_norm,(x,w),fast_mode=True))

    def test_shape_and_epsilon_validation(self):
        with self.assertRaises(ValueError): solution.layer_norm(rand(2,3),rand(2),rand(2))
        with self.assertRaises(ValueError): solution.rms_norm(rand(2,3),rand(3),eps=0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
