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

    def test_large_logits_and_shift_invariance(self):
        x = torch.tensor([[10000.,10001.,9999.],[-10000.,-9998.,-9999.]],dtype=torch.float64)
        close(solution.stable_softmax(x), torch.softmax(x,-1))
        close(solution.stable_softmax(x+12345), solution.stable_softmax(x))
        close(solution.stable_softmax(x).sum(-1), torch.ones(2,dtype=x.dtype))

    def test_axis_and_partial_mask(self):
        x = rand(2,3,4)
        close(solution.stable_softmax(x,1), torch.softmax(x,1))
        x[0,0,2:] = -torch.inf
        close(solution.stable_softmax(x), torch.softmax(x,-1))

    def test_fully_masked_rows_zero_with_finite_gradient(self):
        x = torch.tensor([[-torch.inf,-torch.inf],[0.,-torch.inf]],dtype=torch.float64,requires_grad=True)
        result = solution.stable_softmax(x)
        close(result, torch.tensor([[0.,0.],[1.,0.]],dtype=x.dtype))
        result.sum().backward()
        self.assertTrue(torch.isfinite(x.grad).all())

    def test_half_precision_and_bad_values(self):
        x = torch.tensor([[1000.,999.]],dtype=torch.float16)
        torch.testing.assert_close(solution.stable_softmax(x), torch.softmax(x.float(),-1).half())
        for x in (torch.tensor([float('nan')]),torch.tensor([float('inf')]),torch.empty(2,0),torch.tensor([1,2])):
            with self.assertRaises(ValueError): solution.stable_softmax(x)


if __name__ == "__main__":
    unittest.main(verbosity=2)
