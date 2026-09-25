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

    def test_causal_and_padding_intersection(self):
        valid=torch.tensor([[True,True,False],[True,False,False]])
        actual=solution.make_allowed_mask(3,3,valid)
        expected=torch.tensor([[[[1,0,0],[1,1,0],[1,1,0]]],[[[1,0,0],[1,0,0],[1,0,0]]]],dtype=torch.bool)
        self.assertTrue(torch.equal(actual,expected))

    def test_offset_for_cached_chunk(self):
        valid=torch.ones(1,5,dtype=torch.bool)
        expected=torch.tensor([[[[1,1,1,1,0],[1,1,1,1,1]]]],dtype=torch.bool)
        self.assertTrue(torch.equal(solution.make_allowed_mask(2,5,valid,3),expected))

    def test_fully_padded_keys(self):
        result=solution.make_allowed_mask(2,2,torch.zeros(2,2,dtype=torch.bool))
        self.assertFalse(result.any())

    def test_bad_length_offset_and_mask(self):
        for q,k,off in ((0,2,0),(3,2,0),(1,2,-1),(1,2,2)):
            with self.assertRaises(ValueError): solution.make_allowed_mask(q,k,torch.ones(1,k,dtype=torch.bool),off)
        with self.assertRaises(ValueError): solution.make_allowed_mask(2,2,torch.ones(1,2))
        with self.assertRaises(ValueError): solution.make_allowed_mask(2,2,torch.ones(1,3,dtype=torch.bool))


if __name__ == "__main__":
    unittest.main(verbosity=2)
