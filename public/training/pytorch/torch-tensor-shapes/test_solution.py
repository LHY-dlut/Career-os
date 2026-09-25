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

    def test_split_merge_round_trip_and_layout(self):
        x = torch.arange(48.).reshape(2,3,8)
        heads = solution.split_heads(x, 2)
        self.assertEqual(tuple(heads.shape), (2,2,3,4))
        for b in range(2):
            for h in range(2):
                close(heads[b,h], x[b,:,h*4:(h+1)*4])
        close(solution.merge_heads(heads), x)

    def test_noncontiguous_input(self):
        x = rand(2,8,3).transpose(1,2)
        self.assertFalse(x.is_contiguous())
        close(solution.merge_heads(solution.split_heads(x,4)), x)

    def test_scores_against_independent_einsum(self):
        q, k = rand(2,3,4,5), rand(2,3,7,5)
        close(solution.batched_scores(q,k), torch.einsum('bhid,bhjd->bhij',q,k))

    def test_invalid_shapes_and_heads(self):
        for heads in (0,-1,3):
            with self.assertRaises(ValueError): solution.split_heads(rand(2,3,8),heads)
        with self.assertRaises(ValueError): solution.merge_heads(rand(2,3,8))
        with self.assertRaises(ValueError): solution.batched_scores(rand(2,1,3,4),rand(2,2,3,4))


if __name__ == "__main__":
    unittest.main(verbosity=2)
