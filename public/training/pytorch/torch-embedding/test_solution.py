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

    def test_lookup_padding_and_gradients(self):
        weight = rand(7,4).requires_grad_()
        ids = torch.tensor([[1,2,1],[0,5,2]])
        result = solution.embedding_lookup(ids,weight,padding_idx=0)
        expected = weight.detach()[ids].clone()
        expected[ids==0]=0
        close(result,expected)
        result.sum().backward()
        expected_grad=torch.zeros_like(weight)
        expected_grad[1]=2; expected_grad[2]=2; expected_grad[5]=1
        close(weight.grad,expected_grad)

    def test_without_padding_against_torch(self):
        weight=rand(5,3); ids=torch.tensor([[0,4,2]],dtype=torch.int32)
        close(solution.embedding_lookup(ids,weight),F.embedding(ids,weight))

    def test_empty_sequence(self):
        self.assertEqual(tuple(solution.embedding_lookup(torch.empty(2,0,dtype=torch.long),rand(5,4)).shape),(2,0,4))

    def test_invalid_ids_and_shapes(self):
        for ids in (torch.tensor([[-1]]),torch.tensor([[5]]),torch.tensor([[1.0]]),torch.tensor([1])):
            with self.assertRaises(ValueError): solution.embedding_lookup(ids,rand(5,4))
        with self.assertRaises(ValueError): solution.embedding_lookup(torch.tensor([[1]]),rand(5,4),padding_idx=5)


if __name__ == "__main__":
    unittest.main(verbosity=2)
