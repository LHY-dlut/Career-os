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

    def test_analytical_values(self):
        result=solution.sinusoidal_encoding(3,6,dtype=torch.float64)
        expected=torch.empty(3,6,dtype=torch.float64)
        for p in range(3):
            for i in range(3):
                angle=p/(10000**(2*i/6)); expected[p,2*i]=math.sin(angle); expected[p,2*i+1]=math.cos(angle)
        close(result,expected)
        close(result[0],torch.tensor([0.,1.,0.,1.,0.,1.],dtype=torch.float64))

    def test_offset_and_empty_sequence(self):
        full=solution.sinusoidal_encoding(9,8,dtype=torch.float64)
        close(solution.sinusoidal_encoding(4,8,offset=5,dtype=torch.float64),full[5:])
        self.assertEqual(tuple(solution.sinusoidal_encoding(0,8).shape),(0,8))

    def test_invalid_dimensions_offset_and_dtype(self):
        for dim in (0,3,-2):
            with self.assertRaises(ValueError): solution.sinusoidal_encoding(3,dim)
        with self.assertRaises(ValueError): solution.sinusoidal_encoding(3,4,offset=-1)
        with self.assertRaises(ValueError): solution.sinusoidal_encoding(3,4,dtype=torch.long)


if __name__ == "__main__":
    unittest.main(verbosity=2)
